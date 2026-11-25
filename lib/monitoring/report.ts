/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Foutrapportage zonder persoonsgegevens. Eén plek waar een serverfout langskomt voordat hij ergens
 * heen gaat: nu de console van Vercel, met de gereserveerde module monitoring-sentry straks ook een
 * envelop naar Sentry (zie docs/patronen/sentry-envelope.md).
 *
 * Waarom schoonmaken nodig is (les L-WERK-08): de melding van Drizzle bevat de query mét parameters,
 * een Postgres-detail bevat de sleutelwaarde (`Key (email)=(iemand@voorbeeld.nl)`), en een
 * V8-stack begint met de melding zelf. Dus melding én stack gaan door dezelfde schoonmaak, en de
 * uitkomst wordt afgekapt.
 *
 * Rapporteren mag zelf nooit gooien: een haak die omvalt maakt van één storing twee.
 */

export const MAX_REPORT_LENGTH = 2000;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const CONNECTION_STRING = /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp|https?):\/\/[^\s"']*:[^\s"'@]*@[^\s"']+/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/g;
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g;
const KEY_DETAIL = /Key \(([^)]*)\)=\([^)]*\)/g;
const DRIZZLE_PARAMS = /\bparams:\s[\s\S]*$/;
const SAS_OR_SIGNATURE = /([?&](?:sig|sv|se|sp|token|key|secret)=)[^&\s"']+/gi;

/** Haalt uit een tekst weg wat naar een persoon of een geheim kan wijzen. Puur, dus los te testen. */
export function scrubMessage(text: string): string {
  const cleaned = text
    .replace(DRIZZLE_PARAMS, "params: [weggelaten]")
    .replace(KEY_DETAIL, "Key ($1)=(...)")
    .replace(CONNECTION_STRING, "[verbindingsstring]")
    .replace(BEARER, "Bearer [token]")
    .replace(JWT, "[token]")
    .replace(SAS_OR_SIGNATURE, "$1[weggelaten]")
    .replace(EMAIL, "[e-mail]");
  return cleaned.length > MAX_REPORT_LENGTH ? `${cleaned.slice(0, MAX_REPORT_LENGTH)} [afgekapt]` : cleaned;
}

export interface ReportContext {
  /** Het routebestand, zoals `/app/admin/[id]` (uit `onRequestError`), of een eigen naam voor een script. */
  readonly route?: string;
  readonly method?: string;
  /** `render`, `route`, `action` of `proxy` bij Next; `cron` bij een stap uit `runSteps`; vrij bij eigen aanroepen. */
  readonly kind?: string;
}

export interface ErrorReport {
  readonly name: string;
  readonly message: string;
  readonly stack: string | undefined;
  /** De digest die Next in plaats van de melding naar de browser stuurt; daarmee is een melding terug te vinden. */
  readonly digest: string | undefined;
}

/** Maakt van een gegooide waarde een schoongemaakt rapport. Gooit zelf nooit. */
export function describeError(error: unknown): ErrorReport {
  try {
    if (error instanceof Error) {
      const digest = "digest" in error && typeof error.digest === "string" ? error.digest : undefined;
      return {
        name: error.name,
        message: scrubMessage(error.message),
        stack: error.stack === undefined ? undefined : scrubMessage(error.stack),
        digest,
      };
    }
    return { name: typeof error, message: scrubMessage(String(error)), stack: undefined, digest: undefined };
  } catch {
    return { name: "unknown", message: "[niet te beschrijven]", stack: undefined, digest: undefined };
  }
}

/** Een foutcode: de SQLSTATE van Postgres (`23514`) of een code van Node (`ECONNRESET`). */
const CAUSE_CODE = /^[A-Z0-9_]{2,40}$/;
/** Een naam uit het eigen schema: een check, een index, een tabel of een kolom. */
const SCHEMA_NAME = /^[a-z0-9_]{1,63}$/;
/** Zo diep kijken we in de keten van oorzaken. Genoeg voor Drizzle om de driver, en eindig bij een kring. */
const CAUSE_DEPTH = 5;

/**
 * Waarom een fout gebeurde, als labels. Zie besluit D16 en les L-WERK-15.
 *
 * **Waarom dit bestaat.** De melding van Drizzle zegt wat er misging ("Failed query: update ...") en
 * niet waarom: de reden zit in `error.cause`, de fout van Postgres. In een eerder project kostte een
 * melding zonder oorzaak een onderzoek, en het bleef een vermoeden. Met de naam van de check erbij
 * is het antwoord één blik.
 *
 * **Wat er nooit meegaat:** `message` en `detail` van de oorzaak. Postgres zet daar de inhoud van de
 * rij in ("Failing row contains ..."). Een waarde gaat alleen mee als hij eruitziet als een code of
 * als een naam uit het schema; die twee patronen zijn de grens, en ze horen streng te blijven.
 *
 * Puur, dus toetsbaar. De gereserveerde module monitoring-sentry stuurt dezelfde labels mee.
 */
export function causeTags(error: unknown): Record<string, string> {
  let current: unknown = error;

  for (let depth = 0; depth < CAUSE_DEPTH; depth += 1) {
    if (typeof current !== "object" || current === null) return {};

    const one = current as { code?: unknown; constraint?: unknown; table?: unknown; column?: unknown; cause?: unknown };
    if (typeof one.code === "string" && CAUSE_CODE.test(one.code)) {
      const tags: Record<string, string> = { cause_code: one.code };
      const names = [
        ["cause_constraint", one.constraint],
        ["cause_table", one.table],
        ["cause_column", one.column],
      ] as const;
      for (const [tag, value] of names) {
        if (typeof value === "string" && SCHEMA_NAME.test(value)) tags[tag] = value;
      }
      return tags;
    }
    current = one.cause;
  }

  return {};
}

/** De labels als één stuk tekst voor de logregel: ` [cause_code=23514 cause_constraint=...]`, of leeg. */
function causeText(error: unknown): string {
  const tags = Object.entries(causeTags(error));
  return tags.length === 0 ? "" : ` [${tags.map(([tag, value]) => `${tag}=${value}`).join(" ")}]`;
}

/**
 * Meldt een serverfout. Nu: één regel naar de console van Vercel, schoongemaakt, met de oorzaak als
 * labels erachter (`causeTags`). De gereserveerde module monitoring-sentry hangt hier het versturen
 * aan, zonder dat de aanroepers veranderen.
 */
export async function reportError(error: unknown, context: ReportContext = {}): Promise<void> {
  try {
    const report = describeError(error);
    const where = [context.kind, context.method, context.route].filter((part) => part !== undefined && part !== "").join(" ");
    console.error(`[report] ${where === "" ? "?" : where}: ${report.name}: ${report.message}${report.digest === undefined ? "" : ` (digest ${report.digest})`}${causeText(error)}`);
    if (report.stack !== undefined) console.error(report.stack);
  } catch {
    /* Rapporteren mag nooit zelf een fout worden. */
  }
}
