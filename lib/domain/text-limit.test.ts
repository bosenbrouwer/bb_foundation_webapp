/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { limitedText } from "./text-limit";

describe("vrije tekst met een maximum", () => {
  it("laat tekst tot en met het maximum door, zonder de randen", () => {
    expect(limitedText("  tien teken  ", { max: 10 })).toEqual({ ok: true, value: "tien teken" });
  });

  it("weigert boven het maximum en kapt niet af", () => {
    expect(limitedText("elf tekens!", { max: 10 })).toEqual({ ok: false, reason: "tooLong", max: 10 });
  });

  it("telt een teken buiten het basisvlak als één teken", () => {
    const three = "a\u{1F600}b";
    expect(limitedText(three, { max: 3 })).toEqual({ ok: true, value: three });
    expect(limitedText(three, { max: 2 })).toEqual({ ok: false, reason: "tooLong", max: 2 });
  });

  it("weigert leeg, alleen witruimte en wat geen tekst is, tenzij het veld leeg mag zijn", () => {
    for (const input of ["", "   ", null, undefined, 12, ["a"]]) expect(limitedText(input, { max: 10 })).toEqual({ ok: false, reason: "required", max: 10 });
    expect(limitedText("   ", { max: 10, optional: true })).toEqual({ ok: true, value: "" });
    expect(limitedText(undefined, { max: 10, optional: true })).toEqual({ ok: true, value: "" });
  });
});
