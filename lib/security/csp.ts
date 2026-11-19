/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De Content Security Policy, met een nonce per verzoek. Zie besluit D14 en `proxy.ts`.
 *
 * ---
 *
 * **Waarom een nonce.** Een vaste CSP met `script-src 'self' 'unsafe-inline'` laat elk inline
 * script toe, want Next hydrateert met inline scripts. Dan voert de browser ook een script uit dat
 * een aanvaller via een fout in onze weergave op de pagina krijgt: de CSP droeg XSS niet, alleen de
 * code zelf. Met een nonce voert de browser alleen scripts uit die het geheime getal van dit
 * verzoek dragen. Next zet dat getal zelf op zijn scripts: het leest het uit de CSP-header van het
 * verzoek, die `proxy.ts` zet.
 *
 * **`'strict-dynamic'`**: een script met de nonce mag andere scripts laden (de chunks van Next), en
 * die erven het vertrouwen. Een lijst met hosts erbij is dan overbodig, en `'self'` blijft alleen
 * staan voor browsers die `'strict-dynamic'` niet kennen.
 *
 * **Styles houden `'unsafe-inline'`**: React zet `style`-attributen, en een nonce geldt niet voor
 * een attribuut. Een style kan geen script uitvoeren; het risico daar is klein en de prijs van
 * dichtzetten groot (elke `style={...}` herschrijven).
 *
 * **`worker-src 'self'` uitdrukkelijk**: zonder valt een worker terug op `script-src`, en daar
 * negeert `'strict-dynamic'` het woord `'self'`.
 *
 * **Een eigen `<script>` of `next/script` in een project** krijgt de nonce uit
 * `(await headers()).get("x-nonce")`; zonder weigert de browser hem.
 *
 * **Wat geen nonce krijgt.** De bestanden van Next en een pad dat op de extensie van een bestand
 * eindigt (`STATIC_FILE_EXTENSIONS`) komen niet langs de proxy: daar staat geen pagina. Een route
 * onder `/api` en een prefetch van `next/link` komen er wel langs, voor de poort van de inlog, maar
 * krijgen geen nonce (`wantsNonce` hieronder). Een pad met een punt dat niet op zo'n extensie
 * eindigt (`/iemand/jan.jansen`, `/v1.2/notities`, een onbekend adres als `/iets.x`) is wel een
 * pagina en krijgt de nonce; in een eerder project viel de CSP weg op elk adres met een punt erin.
 * De HTML-pagina's van Auth.js onder `/api/auth` (de foutpagina, uitloggen) krijgen de vaste
 * `STATIC_CSP` zonder scripts, uit `lib/config/next-base.ts`. Besluit D17.
 *
 * Puur, zodat het te testen is zonder verzoek.
 */

/**
 * De extensies waarop een bestand uit `public/` of een metadata-route van Next eindigt. Deze lijst
 * staat ook letterlijk in de matcher van `proxy.ts`, want Next leest die matcher bij het bouwen en
 * kan er geen variabele in volgen; `csp-coverage.test.ts` houdt de twee gelijk.
 */
export const STATIC_FILE_EXTENSIONS = ["ico", "png", "jpg", "jpeg", "gif", "svg", "webp", "avif", "txt", "xml", "json", "webmanifest", "woff", "woff2", "ttf", "otf", "map", "css", "js", "pdf"] as const;

/**
 * De vaste policy voor HTML die buiten de proxy valt: geen scripts, alleen eigen opmaak en
 * afbeeldingen, formulieren alleen naar onszelf. Zonder nonce, want deze antwoorden komen niet langs
 * de proxy.
 */
export const STATIC_CSP = "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";

/**
 * Een verzoek waarmee `next/link` een pagina vooruit ophaalt. De proxy besliste dit eerst in zijn
 * matcher, en sloeg zo'n verzoek dan helemaal over: wie de kop zelf meestuurde, kwam ook langs de
 * poort van de inlog. Nu komt elk verzoek langs de poort, en beslist deze functie alleen over de nonce.
 */
export function isPrefetch(headers: { get(name: string): string | null }): boolean {
  return headers.get("next-router-prefetch") !== null || headers.get("purpose") === "prefetch";
}

/** Krijgt dit verzoek een nonce en de CSP die hem noemt? Alleen een pagina, en geen prefetch. */
export function wantsNonce(pathname: string, prefetch: boolean): boolean {
  return !prefetch && pathname !== "/api" && !pathname.startsWith("/api/");
}

/** Een onvoorspelbaar getal voor één verzoek, als base64. 128 bits, zoals CSP aanraadt. */
export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function contentSecurityPolicy(nonce: string, options: { development: boolean }): string {
  return [
    "default-src 'self'",
    /* In ontwikkeling draait de HMR van Next op eval; in productie nooit. */
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
