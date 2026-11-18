import type { AiSmuggleCase } from "../lib/ai/outgoing";

/**
 * De smokkelgevallen van dit project voor `pnpm check:ai`: per prompt die uit de database leest één
 * geval. Zie docs/modules/ai.md, "De witte lijst, bewezen".
 *
 * `values` bouwt de waarden met dezelfde pure functie als de server action van de knop, voor een rij
 * die de check eerst zelf aanmaakt (alles wordt teruggedraaid). `forbidden` zegt wat er uit diezelfde
 * database nooit in het bericht mag staan: een naam, een mailadres, een bedrag, iets van een collega
 * of van een andere organisatie, en ook wat alleen af te leiden is.
 *
 *     {
 *       prompt: "menu_proposal",
 *       values: async (db, context) => {
 *         const request = await createCheckRequest(db, context, { contactName: "Smokkelnaam Verboden", quotedCents: 987654 });
 *         return menuValues(request);
 *       },
 *       forbidden: async () => ["Smokkelnaam Verboden", "987654"],
 *     }
 *
 * Dit bestand is van het project en blijft staan bij een update van het template.
 */
export const AI_SMUGGLE_CASES: readonly AiSmuggleCase[] = [];
