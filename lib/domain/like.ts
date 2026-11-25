/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Zoektekst veilig in een `like`- of `ilike`-patroon.
 *
 * Het patroon zelf gaat als parameter naar Postgres, dus van injectie is geen sprake. Maar `%` en
 * `_` zijn in een patroon jokers: wie `_` zoekt, vindt alles, en een tekst vol `%` laat de matcher
 * per rij terugkrabbelen. Dit zet er een backslash voor, zodat alleen de twee `%` van de aanroeper
 * nog joker zijn. Postgres leest de backslash standaard als escape in `like`.
 *
 *     ilike(orders.name, `%${escapeLike(search)}%`)
 */
export function escapeLike(text: string): string {
  return text.replace(/[%_\\]/g, "\\$&");
}
