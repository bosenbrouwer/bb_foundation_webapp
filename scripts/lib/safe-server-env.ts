/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De variabelen die elk script meegeeft aan een server die het zelf start: de e2e
 * (`playwright.config.ts`), en straks een aanvalsscript of een crawl. Zie les L-AI-08 en L-NEXT-21.
 *
 * **Waarom dit bestaat.** Een server die een script start, leest `.env.local`. Staat daar de sleutel
 * van het model, dan doet elke test, elke aanval en elke crawl die een AI-knop raakt een echte
 * aanroep: met de testtekst erin en op eigen kosten. In een eerder project stond de sleutel van het
 * model niet in de lijst van onklaar gemaakte koppelingen van het aanvalsscript; dat het goed ging,
 * kwam doordat de sleutel toevallig niet lokaal stond.
 *
 * **Leeg en niet weg.** Een variabele die al bestaat, ook leeg, vult Next niet opnieuw uit
 * `.env.local`. Weglaten helpt dus niet: dan komt de sleutel er alsnog in.
 *
 * Een koppeling die geld kost of iets naar buiten stuurt, zet je hier uitdrukkelijk uit. Het
 * nagemaakte model (`AI_FAKE`) staat aan, zodat een scherm met een AI-knop in de e2e wel een
 * voorstel krijgt; het werkt alleen met `APP_ENV=local` en gooit in elke andere omgeving.
 */
export const SAFE_SERVER_ENV: Readonly<Record<string, string>> = {
  ANTHROPIC_API_KEY: "",
  AI_FAKE: "1",
};
