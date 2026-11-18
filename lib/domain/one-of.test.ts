/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { oneOf } from "./one-of";

const STATES = ["open", "closed"] as const;

describe("oneOf", () => {
  it("geeft de waarde terug als hij op de lijst staat", () => {
    expect(oneOf("open", STATES)).toBe("open");
  });

  it("geeft undefined bij een onbekende waarde, een andere schrijfwijze of iets wat geen tekst is", () => {
    expect(oneOf("deleted", STATES)).toBeUndefined();
    expect(oneOf("OPEN", STATES)).toBeUndefined();
    expect(oneOf("", STATES)).toBeUndefined();
    expect(oneOf(null, STATES)).toBeUndefined();
    expect(oneOf(["open"], STATES)).toBeUndefined();
  });
});
