/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { labels } from "@/lib/i18n/labels";
import { aiFake, fakeAnswer, fakeText } from "./fake";
import type { AiPrompt } from "./prompts";
import { interpret } from "./run";

const PROMPT: AiPrompt = {
  key: "menu_proposal",
  version: 1,
  title: "Menuvoorstel",
  instruction: "Je bent de chef en stelt een eerste menu voor bij een aanvraag.",
  fields: ["Soort evenement"],
  output: [
    { key: "title", label: "Titel", kind: "short", maxLength: 80 },
    { key: "style", label: "Stijl", kind: "choice", options: ["Klassiek", "Seizoen", "Overig"] },
    { key: "guests", label: "Aantal gasten", kind: "number", min: 2, max: 400 },
    { key: "vegetarian", label: "Vegetarisch", kind: "yesno" },
    { key: "tags", label: "Trefwoorden", kind: "list", maxItems: 3 },
    { key: "courses", label: "Gangen", kind: "list", maxItems: 5, items: [{ key: "name", label: "Gang" }, { key: "description", label: "Beschrijving" }] },
    { key: "explanation", label: "Toelichting", kind: "long", maxLength: 12 },
  ],
  defaultEffort: "low",
};

describe("het slot op het nagemaakte model", () => {
  it("staat uit zonder de vlag", () => {
    expect(aiFake({})).toBe(false);
    expect(aiFake({ AI_FAKE: "0", APP_ENV: "local" })).toBe(false);
  });

  it("staat aan met de vlag in een uitdrukkelijk lokale omgeving", () => {
    expect(aiFake({ AI_FAKE: "1", APP_ENV: "local" })).toBe(true);
  });

  it("gooit met de vlag in elke andere omgeving, ook een onbekende", () => {
    expect(() => aiFake({ AI_FAKE: "1" })).toThrow(/niet lokaal/);
    expect(() => aiFake({ AI_FAKE: "1", APP_ENV: "production" })).toThrow(/niet lokaal/);
    expect(() => aiFake({ AI_FAKE: "1", APP_ENV: "preview" })).toThrow(/niet lokaal/);
    /* Een deploy is nooit lokaal, ook niet als iemand APP_ENV=local in de host heeft gezet. */
    expect(() => aiFake({ AI_FAKE: "1", APP_ENV: "local", VERCEL_ENV: "preview" })).toThrow(/niet lokaal/);
  });
});

describe("een nagemaakt antwoord", () => {
  it("gaat door dezelfde toets als een echt antwoord en past in de structuur", () => {
    const outcome = interpret(PROMPT, fakeAnswer(PROMPT));
    expect(outcome.status).toBe("ok");
    expect(outcome.proposal).toEqual({
      title: fakeText("Titel"),
      style: "Overig",
      guests: 2,
      vegetarian: false,
      tags: [fakeText("Trefwoorden")],
      courses: [{ name: fakeText("Gang"), description: fakeText("Beschrijving") }],
      explanation: fakeText("Toelichting", 12),
    });
  });

  it("begint elke tekst met het woord dat zegt dat hij nagemaakt is, en blijft binnen de grens", () => {
    expect(fakeText("Titel").startsWith(labels.ai.fakePrefix)).toBe(true);
    expect(fakeText("Toelichting", 12)).toHaveLength(12);
  });

  it("is twee keer hetzelfde", () => {
    expect(fakeAnswer(PROMPT)).toEqual(fakeAnswer(PROMPT));
  });
});
