/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { escapeLike } from "./like";

describe("escapeLike", () => {
  it("laat gewone tekst met rust", () => {
    expect(escapeLike("Jansen bv")).toBe("Jansen bv");
  });

  it("zet een backslash voor de twee jokers en voor de backslash zelf", () => {
    expect(escapeLike("100%")).toBe(String.raw`100\%`);
    expect(escapeLike("a_b")).toBe(String.raw`a\_b`);
    expect(escapeLike(String.raw`c:\map`)).toBe(String.raw`c:\\map`);
    expect(escapeLike("%_%")).toBe(String.raw`\%\_\%`);
  });
});
