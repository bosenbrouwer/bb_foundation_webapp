/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { outgoingText, smuggled } from "./outgoing";
import { AI_PROMPTS } from "./prompts";

const PROMPT = { instruction: "Je bent de planner. Sorteer de aanvraag.", fields: ["Soort", "Wensen"] };

/** Zo ziet de functie van een project eruit: één pure functie die de waarden van een rij opbouwt. */
interface RequestRow {
  readonly kind: string;
  readonly wishes: string;
  readonly contactName: string;
  readonly quotedCents: number;
}
const requestValues = (row: RequestRow) => ({ Soort: row.kind, Wensen: row.wishes });
const leakyValues = (row: RequestRow) => ({ Soort: row.kind, Wensen: `${row.wishes} (voor ${row.contactName}, offerte ${row.quotedCents})` });

const SMUGGLED: RequestRow = { kind: "lunch", wishes: "vegetarisch", contactName: "Smokkelnaam Verboden", quotedCents: 987654 };
const FORBIDDEN = [SMUGGLED.contactName, String(SMUGGLED.quotedCents)];

describe("de smokkeltest", () => {
  it("vindt niets als de functie alleen de velden van de witte lijst vult", () => {
    const text = outgoingText(PROMPT, requestValues(SMUGGLED));
    expect(text).toContain("Wensen: vegetarisch");
    expect(smuggled(text, FORBIDDEN)).toEqual([]);
  });

  it("vindt een naam en een bedrag die in een toegestaan veld zijn geplakt", () => {
    expect(smuggled(outgoingText(PROMPT, leakyValues(SMUGGLED)), FORBIDDEN)).toEqual(FORBIDDEN);
  });

  it("laat een veld buiten de witte lijst niet door, ook als de aanroeper het meegeeft", () => {
    const text = outgoingText(PROMPT, { ...requestValues(SMUGGLED), Contactpersoon: SMUGGLED.contactName });
    expect(smuggled(text, FORBIDDEN)).toEqual([]);
  });

  it("let niet op hoofdletters, en telt een lege of te korte verboden tekst niet", () => {
    expect(smuggled("Voor SMOKKELNAAM verboden", ["smokkelnaam Verboden"])).toEqual(["smokkelnaam Verboden"]);
    expect(smuggled("abc", ["", "  ", "ab"])).toEqual([]);
  });

  it("geldt voor elke prompt uit de catalogus: wat niet in fields staat, gaat niet mee", () => {
    for (const prompt of AI_PROMPTS) {
      const values = Object.fromEntries(prompt.fields.map((field) => [field, "toegestaan"]));
      const text = outgoingText(prompt, { ...values, "Gesmokkeld veld": "Smokkelnaam Verboden" });
      expect(smuggled(text, ["Smokkelnaam Verboden"]), prompt.key).toEqual([]);
    }
  });
});
