/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { enumOr, keyed } from "./keys";

const ROWS = [
  { id: "b57cbc18-02f9-4695-bd99-3d5c2af8c85d", name: "Eerste" },
  { id: "5d863605-0886-42db-bda2-978a85a7026a", name: "Tweede" },
];

describe("keyed: korte sleutels in plaats van id's", () => {
  it("geeft elke rij een sleutel met een volgnummer vanaf 1", () => {
    expect(keyed("w", ROWS).entries.map((entry) => entry.key)).toEqual(["w1", "w2"]);
  });

  it("zoekt de rij bij een sleutel uit het antwoord", () => {
    expect(keyed("w", ROWS).find("w2")).toBe(ROWS[1]);
  });

  it("laat een sleutel vallen die het model verzon, ook als het een echt id is", () => {
    const rows = keyed("w", ROWS);
    expect(rows.find("w3")).toBeUndefined();
    expect(rows.find("W1")).toBeUndefined();
    expect(rows.find(ROWS[0]?.id)).toBeUndefined();
    expect(rows.find(1)).toBeUndefined();
    expect(rows.find(null)).toBeUndefined();
  });

  it("weigert een voorvoegsel dat geen een tot drie kleine letters is", () => {
    expect(() => keyed("regel", ROWS)).toThrow();
    expect(() => keyed("", ROWS)).toThrow();
  });
});

describe("enumOr: een onbekende keuze wordt de keuze die niets doet", () => {
  const SKILLS = ["book", "explain", "other"] as const;

  it("laat een geldige keuze door", () => {
    expect(enumOr("book", SKILLS, "other")).toBe("book");
  });

  it("maakt van al het andere de onschuldige keuze", () => {
    for (const value of ["delete_everything", "BOOK", "", null, undefined, 3, { skill: "book" }]) {
      expect(enumOr(value, SKILLS, "other")).toBe("other");
    }
  });
});
