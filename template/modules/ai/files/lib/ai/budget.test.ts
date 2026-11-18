/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { CENT_TOKENS_PER_CENT, capState, capVerdict, nextMonthStart, parseCap } from "./budget";

/** Een bedrag in centen als centtokens. */
const spent = (cents: number) => cents * CENT_TOKENS_PER_CENT;

describe("hoe ver de maand is", () => {
  it("kent zonder plafond geen stand", () => {
    expect(capState(spent(999_999), null)).toEqual({ level: "none", percent: null });
  });

  it("waarschuwt vanaf tachtig procent en is bereikt op honderd, precies op de grens", () => {
    expect(capState(0, 2500)).toEqual({ level: "ok", percent: 0 });
    expect(capState(spent(2000) - 1, 2500)).toEqual({ level: "ok", percent: 79 });
    expect(capState(spent(2000), 2500)).toEqual({ level: "warning", percent: 80 });
    expect(capState(spent(2500) - 1, 2500)).toEqual({ level: "warning", percent: 99 });
    expect(capState(spent(2500), 2500)).toEqual({ level: "reached", percent: 100 });
    expect(capState(spent(6000), 2500)).toEqual({ level: "reached", percent: 240 });
  });

  it("rekent in hele getallen, ook bij het kleinste en het grootste plafond", () => {
    expect(capState(CENT_TOKENS_PER_CENT - 1, 1)).toEqual({ level: "warning", percent: 99 });
    expect(capState(CENT_TOKENS_PER_CENT, 1)).toEqual({ level: "reached", percent: 100 });
    expect(capState(spent(10_000_000) - 1, 10_000_000)).toEqual({ level: "warning", percent: 99 });
    expect(capState(spent(10_000_000), 10_000_000)).toEqual({ level: "reached", percent: 100 });
  });
});

describe("wanneer het plafond opnieuw telt", () => {
  it("geeft voor elke maand van het jaar de eerste van de volgende, ook over de jaargrens", () => {
    const expected = ["2027-02-01", "2027-03-01", "2027-04-01", "2027-05-01", "2027-06-01", "2027-07-01", "2027-08-01", "2027-09-01", "2027-10-01", "2027-11-01", "2027-12-01", "2028-01-01"];
    for (let month = 1; month <= 12; month += 1) {
      const mm = String(month).padStart(2, "0");
      for (const day of ["01", "15", "28"]) expect(nextMonthStart(`2027-${mm}-${day}`)).toBe(expected[month - 1]);
    }
  });

  it("struikelt niet over de laatste dag van een maand of een schrikkeldag", () => {
    expect(nextMonthStart("2028-02-29")).toBe("2028-03-01");
    expect(nextMonthStart("2027-01-31")).toBe("2027-02-01");
    expect(nextMonthStart("2027-12-31")).toBe("2028-01-01");
  });
});

describe("wat een beheerder als plafond typt", () => {
  it("leest een bedrag met een komma, een punt of een dollarteken als centen", () => {
    expect(parseCap("25")).toEqual({ ok: true, cents: 2500 });
    expect(parseCap("25,50")).toEqual({ ok: true, cents: 2550 });
    expect(parseCap("25.5")).toEqual({ ok: true, cents: 2550 });
    expect(parseCap("$ 0,01")).toEqual({ ok: true, cents: 1 });
  });

  it("leest leeg als geen plafond", () => {
    expect(parseCap("")).toEqual({ ok: true, cents: null });
    expect(parseCap("   ")).toEqual({ ok: true, cents: null });
  });

  it("weigert nul, negatief, drie decimalen, een andere valuta en te groot", () => {
    expect(parseCap("0")).toEqual({ ok: false, reason: "zero" });
    expect(parseCap("0,00")).toEqual({ ok: false, reason: "zero" });
    expect(parseCap("-5")).toEqual({ ok: false, reason: "format" });
    expect(parseCap("2,505")).toEqual({ ok: false, reason: "format" });
    expect(parseCap("EUR 25")).toEqual({ ok: false, reason: "format" });
    expect(parseCap("vijfentwintig")).toEqual({ ok: false, reason: "format" });
    expect(parseCap("100000,01")).toEqual({ ok: false, reason: "tooLarge" });
  });
});

describe("of een verzoek er nog door mag", () => {
  const base = { capCents: 2500, capCurrency: "USD", priceCurrency: "USD", spentCentTokens: 0, fake: false };

  it("laat zonder plafond alles door, ook zonder prijs", () => {
    expect(capVerdict({ ...base, capCents: null, priceCurrency: null, spentCentTokens: spent(999_999) })).toBeNull();
  });

  it("weigert met een plafond een model zonder prijs, of met een prijs in een andere valuta", () => {
    expect(capVerdict({ ...base, priceCurrency: null })).toBe("noPrice");
    expect(capVerdict({ ...base, priceCurrency: "EUR" })).toBe("noPrice");
  });

  it("weigert zodra de maand het plafond bereikt, niet eerder", () => {
    expect(capVerdict({ ...base, spentCentTokens: spent(2500) - 1 })).toBeNull();
    expect(capVerdict({ ...base, spentCentTokens: spent(2500) })).toBe("monthLimit");
  });

  it("vraagt het nagemaakte model geen prijs, maar houdt het wel aan het plafond", () => {
    expect(capVerdict({ ...base, fake: true, priceCurrency: null })).toBeNull();
    expect(capVerdict({ ...base, fake: true, priceCurrency: null, spentCentTokens: spent(2500) })).toBe("monthLimit");
  });
});
