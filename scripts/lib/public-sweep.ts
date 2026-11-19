/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het pure deel van `pnpm check:public`: welke adressen de build kent, wat er zonder sessie op
 * gevraagd wordt, en wanneer een antwoord een weigering is. Het starten van de server en het
 * versturen staan in scripts/check-public.ts.
 *
 * **Uit de build, niet uit de bron.** De lijst komt uit `.next/app-path-routes-manifest.json`: dat
 * is wat er straks echt staat, met de pagina's en routes van elke module erbij. Een lijst met de
 * hand loopt achter op de dag dat iemand een route toevoegt.
 *
 * **Twee soorten bewijs.** Met de poort van de proxy aan telt alleen het eerste antwoord: een
 * pagina wordt de inlog, een route onder `/api` een 401. Met de poort uit, of met een cookie die
 * de poort wel doorlaat maar die niets waard is, telt waar het verzoek eindigt: op het inlogscherm,
 * of op een 401, 403, 404 of 405. Nooit op een 200 met inhoud, en nooit op een 500: wie zonder
 * sessie een 500 geeft, deed iets voordat hij naar de sessie keek.
 */

/** Een geldig id dat niet bestaat, voor een `[id]` in het adres. */
export const SAMPLE_ID = "00000000-0000-4000-8000-000000000000";

export type TargetKind = "page" | "route";

export interface Target {
  /** Het adres zoals de build het noemt, met `[id]` erin. */
  readonly route: string;
  /** Het adres dat de ronde opvraagt. */
  readonly path: string;
  readonly kind: TargetKind;
  /** Staat het op de lijst van openbare adressen? */
  readonly open: boolean;
}

/** Een adres uit de build als iets dat op te vragen is: elk dynamisch stuk wordt een waarde. */
export function concretePath(route: string): string {
  return route
    .split("/")
    .map((part) => {
      if (/^\[\[?\.\.\..+\]\]?$/.test(part)) return "x";
      if (/^\[.+\]$/.test(part)) return SAMPLE_ID;
      return part;
    })
    .join("/");
}

/**
 * De pagina's en routes uit het manifest van de build. De eigen pagina's van het framework
 * (`/_not-found`, `/_global-error`) en de metadatabestanden (`/icon.png`, `/robots.txt`) vallen
 * weg: daar staat geen inhoud van de tool.
 */
export function targetsFromManifest(manifest: Readonly<Record<string, string>>, isPublic: (path: string) => boolean): Target[] {
  const targets: Target[] = [];
  for (const [key, route] of Object.entries(manifest)) {
    const kind: TargetKind | undefined = key.endsWith("/page") ? "page" : key.endsWith("/route") ? "route" : undefined;
    if (kind === undefined || route.startsWith("/_")) continue;
    if (kind === "route" && /\.[a-z0-9]+$/i.test(route)) continue;
    const path = concretePath(route);
    targets.push({ route, path, kind, open: isPublic(path) });
  }
  return targets.sort((a, b) => a.path.localeCompare(b.path));
}

/** Eén antwoord: de status, en waar hij heen wijst als het een doorverwijzing is. */
export interface Seen {
  readonly status: number;
  /** Het pad uit de `location`, of null zonder doorverwijzing. `external` als hij de eigen host verlaat. */
  readonly location: string | null;
}

/** Het pad waar een `location` naar wijst, of `external` als dat buiten dit adres is. */
export function locationPath(location: string | null, base: string): string | null {
  if (location === null) return null;
  try {
    const target = new URL(location, base);
    return target.origin === new URL(base).origin ? target.pathname : "external";
  } catch {
    return "external";
  }
}

const isRedirect = (status: number): boolean => status >= 300 && status < 400;

/** Statussen die een weigering zijn: geen sessie, niet toegestaan, bestaat niet, deze methode niet. */
const REFUSALS = new Set([401, 403, 404, 405]);

/**
 * Met de poort aan en zonder cookie: het eerste antwoord. Geeft de reden als het geen weigering is,
 * en anders niets.
 */
export function judgeGate(target: Target, seen: Seen, signInPath: string): string | undefined {
  if (target.kind === "route") {
    return seen.status === 401 ? undefined : `de poort gaf ${seen.status} en geen 401`;
  }
  if (isRedirect(seen.status) && seen.location === signInPath) return undefined;
  return `de poort gaf ${seen.status}${seen.location === null ? "" : ` naar ${seen.location}`} en niet de inlog`;
}

/**
 * Voorbij de poort: de reeks antwoorden tot het verzoek stilstaat. Goed is: geëindigd op een
 * openbaar adres na minstens één doorverwijzing, of op een weigering.
 */
export function judgeInside(hops: readonly Seen[], isPublic: (path: string) => boolean): string | undefined {
  const last = hops.at(-1);
  if (last === undefined) return "geen antwoord";
  if (hops.some((hop) => hop.location === "external")) return "stuurt door naar een ander adres";
  if (isRedirect(last.status)) return `blijft doorsturen (${hops.length} keer), laatst naar ${last.location ?? "nergens"}`;
  if (last.status >= 500) return `geeft ${last.status}: hij doet iets voordat hij de sessie controleert, of kan niet weigeren zonder database`;
  if (REFUSALS.has(last.status)) return undefined;

  const arrivedAt = hops.length > 1 ? hops.at(-2)?.location : null;
  if (arrivedAt !== null && arrivedAt !== undefined && isPublic(arrivedAt)) return undefined;
  return `geeft ${last.status} zonder geldige sessie`;
}

/** Een cronroute zonder token: alleen een kale 404 is goed. */
export function judgeCron(seen: Seen): string | undefined {
  return seen.status === 404 ? undefined : `geeft ${seen.status} zonder token en geen 404`;
}
