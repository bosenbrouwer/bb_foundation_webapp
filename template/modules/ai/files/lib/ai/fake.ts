/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Een nagemaakt model, voor de e2e en voor lokaal werken zonder sleutel. Besluit A5 in
 * docs/modules/ai.md, les L-AI-07.
 *
 * **Waarom.** Een e2e hoort de knop te kunnen indrukken en het voorstel te kunnen overnemen, en het
 * echte model kost per verzoek geld en geeft nooit twee keer hetzelfde antwoord. `fakeAnswer` maakt
 * uit de vaste structuur van de prompt een voorspelbaar antwoord, dat daarna door precies dezelfde
 * toets gaat als een echt antwoord (`interpret`). Elke tekst erin begint met "Nagemaakt"
 * (`labels.ai.fakePrefix`), zodat niemand het voor een echt voorstel aanziet.
 *
 * **Hetzelfde slot als de dev-login** (`lib/auth/providers/dev-login.ts`): alleen met `AI_FAKE=1` én
 * een uitdrukkelijk lokale omgeving (`APP_ENV=local`). Staat de vlag aan in een deploy, dan gooit
 * `aiFake`: een foutpagina in plaats van stil nepvoorstellen.
 *
 * **Wat een nagemaakt model niet bewijst:** of de instructie werkt, of het echte model de structuur
 * haalt, wat het kost en hoe lang het duurt. Daarvoor zijn de testgevallen in de Playground en
 * `pnpm ai:test`. Een prompt die alleen op het nagemaakte model heeft gedraaid, is niet getest.
 */
import { deployEnvironment } from "@/lib/domain/deploy-environment";
import { labels } from "@/lib/i18n/labels";
import type { AiOutputField, AiPrompt } from "./prompts";

export const AI_FAKE_ENV = "AI_FAKE";

/** Wat er bij een nagemaakt verzoek als model in `ai_requests` staat. */
export const FAKE_MODEL = "fake";

/**
 * Staat het nagemaakte model aan. Gooit als de vlag aan staat in een omgeving die niet
 * uitdrukkelijk lokaal is. De omgeving gaat als argument mee, zodat het slot te toetsen is.
 */
export function aiFake(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  if ((env[AI_FAKE_ENV] ?? "").trim() !== "1") return false;
  const environment = deployEnvironment(env);
  if (environment !== "local") {
    throw new Error(`${AI_FAKE_ENV} staat aan, maar de omgeving is niet lokaal (${environment}). In een deploy mag dat nooit: haal de variabele weg. Lokaal: zet APP_ENV=local.`);
  }
  return true;
}

/** Een tekst die zegt dat hij nagemaakt is, afgekapt op de grens van het onderdeel. */
export function fakeText(label: string, maxLength?: number): string {
  const text = `${labels.ai.fakePrefix}: ${label}`;
  return maxLength === undefined ? text : text.slice(0, Math.max(maxLength, 0));
}

function fakeValue(field: AiOutputField): unknown {
  switch (field.kind) {
    case "choice":
      /* De laatste optie: daar staat in een prompt de uitweg, zoals Overig. */
      return field.options?.at(-1) ?? "";
    case "number":
      return Math.min(field.min ?? 0, field.max ?? Number.POSITIVE_INFINITY);
    case "yesno":
      return false;
    case "list": {
      if (field.maxItems === 0) return [];
      const items = field.items ?? [];
      if (items.length === 0) return [fakeText(field.label)];
      return [Object.fromEntries(items.map((item) => [item.key, fakeText(item.label)]))];
    }
    default:
      return fakeText(field.label, field.maxLength);
  }
}

/** Het antwoord zoals de API het zou geven, in de vaste structuur van de prompt. Zonder netwerk. */
export function fakeAnswer(prompt: Pick<AiPrompt, "output">): { readonly stop_reason: string; readonly content: readonly { readonly type: string; readonly text: string }[] } {
  const value = Object.fromEntries(prompt.output.map((field) => [field.key, fakeValue(field)]));
  return { stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(value) }] };
}
