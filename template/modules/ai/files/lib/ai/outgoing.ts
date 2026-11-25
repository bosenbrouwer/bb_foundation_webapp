/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Wat er naar het model gaat, als één tekst, en de smokkeltest die bewijst wat er niet in zit
 * (docs/modules/ai.md, "De witte lijst, bewezen", lessen L-AI-02 en L-AI-03).
 *
 * **Een witte lijst zonder test is een voornemen.** `buildUserMessage` stuurt alleen de velden uit
 * `fields` mee, maar wat er in zo'n veld staat, bouwt de server action van het project op. Plakt die
 * een naam achter een omschrijving, of geeft hij een getal mee waaruit iets af te leiden is, dan
 * gaat het mee en ziet niemand het. Daarom krijgt elke prompt één pure functie die de waarden
 * opbouwt, en een test die die functie een rij geeft waar verboden gegevens in gesmokkeld zijn en
 * eist dat ze niet in `outgoingText` staan. `pnpm check:ai` doet hetzelfde tegen de database, met de
 * gevallen uit `scripts/check-ai.project.ts`.
 *
 * **Afgeleide gegevens.** Een getal dat op zich onschuldig is, kan zeggen wat je niet wilde zeggen:
 * een dagnorm van nul verraadt een vrije dag. Zet in `forbidden` dus ook wat je niet letterlijk
 * meestuurt maar wat er wel uit te lezen is, en kies de waarde vóór de afleiding (het rooster, niet
 * het rooster min het verlof).
 */
import type { DbOrTransaction } from "@/lib/db/client";
import { buildUserMessage } from "./message";
import type { AiPrompt } from "./prompts";

export type PromptValues = Readonly<Record<string, string | null | undefined>>;

/** Alles wat voor deze prompt naar het model gaat: de instructie en het bericht met de gegevens. */
export function outgoingText(prompt: Pick<AiPrompt, "instruction" | "fields">, values: PromptValues): string {
  return `${prompt.instruction}\n\n${buildUserMessage(prompt.fields, values)}`;
}

/**
 * Welke verboden teksten in de tekst staan, zonder op hoofdletters te letten. Leeg als er niets
 * gesmokkeld is. Een lege of te korte verboden tekst (minder dan drie tekens) telt niet: die staat
 * altijd wel ergens in.
 */
export function smuggled(text: string, forbidden: readonly string[]): string[] {
  const haystack = text.toLowerCase();
  return forbidden.filter((needle) => {
    const wanted = needle.trim().toLowerCase();
    return wanted.length >= 3 && haystack.includes(wanted);
  });
}

export interface SmuggleContext {
  readonly organisationId: string;
  readonly userId: string;
}

/** Een geval voor `pnpm check:ai`: bouw de waarden uit de database, en zeg wat er nooit in mag staan. */
export interface AiSmuggleCase {
  /** De sleutel van de prompt uit de catalogus. */
  readonly prompt: string;
  /** De waarden zoals de server action ze opbouwt, voor de gebruiker van de check. Mag eerst rijen aanmaken: alles wordt teruggedraaid. */
  readonly values: (db: DbOrTransaction, context: SmuggleContext) => Promise<PromptValues>;
  /** Wat er uit dezelfde database nooit mee mag: een naam, een bedrag, iets van een collega of van een andere organisatie. */
  readonly forbidden: (db: DbOrTransaction, context: SmuggleContext) => Promise<readonly string[]>;
}
