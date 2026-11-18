/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Een keuze van buiten tegen een vaste lijst.
 *
 * Een keuzeveld in een formulier, een filter in een URL of een keuze in het antwoord van een model
 * is invoer: de browser toont alleen de opties die wij aanbieden, maar wie het verzoek zelf opstelt,
 * stuurt wat hij wil. Gaat zo'n waarde ongezien naar een enumkolom, dan antwoordt Postgres met een
 * castfout en ziet de gebruiker een 500. Dit geeft de waarde terug als hij op de lijst staat, en
 * anders `undefined`; wat er dan gebeurt (een melding bij het veld, een standaard, een 404) beslist
 * de aanroeper.
 */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}
