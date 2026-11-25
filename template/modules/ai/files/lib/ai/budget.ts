/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het maandplafond, het pure deel: hoe ver de maand is, wat een beheerder typte, en of een verzoek
 * er nog door mag. Geen database, geen klok: elk stuk is los te testen.
 *
 * Het plafond is een bedrag in centen per kalendermaand, in de valuta van de prijzen. De stand is de
 * som van `ai_requests` in centtokens (centen maal tokens, zie cost.ts); een cent is een miljoen
 * centtokens. Vergelijken gebeurt in hele getallen, afronden alleen bij het tonen.
 *
 * Twee dingen die dit plafond niet is. Het is niet de harde grens: de toets loopt voor de aanroep en
 * de kosten zijn pas na afloop bekend, dus een maand kan er net boven eindigen. De harde grens is de
 * uitgavenlimiet op de workspace in de Console. En het is niet de noodstop: die zet alles in één
 * keer uit, ook zonder plafond (`ai_limits.stopped_at`, zie settings.ts).
 */
import { parsePrice } from "./cost";

export const CENT_TOKENS_PER_CENT = 1_000_000;
/** Vanaf dit deel van het plafond waarschuwt Beheer, AI en Beheer, Systeem. */
export const CAP_WARNING_PERCENT = 80;

export type CapLevel = "none" | "ok" | "warning" | "reached";

export interface CapState {
  readonly level: CapLevel;
  /** Hele procenten van het plafond, naar beneden afgerond; null zonder plafond. */
  readonly percent: number | null;
}

/** Hoe ver de maand is. `spentCentTokens` is de som van de maand in de valuta van het plafond. */
export function capState(spentCentTokens: number, capCents: number | null): CapState {
  if (capCents === null) return { level: "none", percent: null };
  /* Eerst delen, dan pas procenten: zo blijft elk tussenresultaat een geheel getal dat past. */
  const percent = Math.floor(spentCentTokens / (capCents * (CENT_TOKENS_PER_CENT / 100)));
  if (spentCentTokens >= capCents * CENT_TOKENS_PER_CENT) return { level: "reached", percent };
  return { level: percent >= CAP_WARNING_PERCENT ? "warning" : "ok", percent };
}

/** De eerste dag van de maand na `today` (jjjj-mm-dd, in de tijdzone van het project): vanaf dan telt het plafond opnieuw. */
export function nextMonthStart(today: string): string {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  return month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

export type CapParse = { readonly ok: true; readonly cents: number | null } | { readonly ok: false; readonly reason: "format" | "tooLarge" | "zero" };

/**
 * Wat een beheerder typte, naar centen. Leeg is geen plafond. Nul is geen plafond maar een
 * vergissing: alles uitzetten doet de noodstop, en die is terug te vinden in het logboek.
 */
export function parseCap(input: string): CapParse {
  const parsed = parsePrice(input);
  if (!parsed.ok) return parsed.reason === "empty" ? { ok: true, cents: null } : { ok: false, reason: parsed.reason };
  if (parsed.cents === 0) return { ok: false, reason: "zero" };
  return { ok: true, cents: parsed.cents };
}

export interface CapFacts {
  readonly capCents: number | null;
  readonly capCurrency: string;
  /** De valuta van de prijs van het model; null als het model nog geen prijs heeft. */
  readonly priceCurrency: string | null;
  readonly spentCentTokens: number;
  /** Het nagemaakte model kost niets en heeft dus geen prijs nodig. */
  readonly fake: boolean;
}

export type CapVerdict = "noPrice" | "monthLimit" | null;

/**
 * Puur: mag dit verzoek er nog door? Zonder plafond altijd. Met een plafond moet het model een prijs
 * hebben in de valuta van het plafond: een verzoek dat niet te tellen is, zou het plafond ongezien
 * laten lekken. En de maand mag het plafond nog niet bereikt hebben.
 */
export function capVerdict(facts: CapFacts): CapVerdict {
  if (facts.capCents === null) return null;
  if (!facts.fake && facts.priceCurrency !== facts.capCurrency) return "noPrice";
  return capState(facts.spentCentTokens, facts.capCents).level === "reached" ? "monthLimit" : null;
}
