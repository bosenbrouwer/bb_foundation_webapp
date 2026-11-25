/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, expectTypeOf, it } from "vitest";
import { assertAuditFacts, AuditContentError, auditCode, auditCodes, auditFacts, auditLength, isAuditCode, type AuditChecked, type AuditCode, type AuditFacts } from "./audit-facts";

describe("een korte code", () => {
  it("is een sleutel, een status, een rol, een model-id, een pad, een id of een datum", () => {
    for (const value of ["admin", "password_reset", "claude-haiku-5-5", "/admin/ai", "USD", "3f0c1a52-7b1e-4c7e-9d51-6a1f2b3c4d5e", "2026-11-18T10:00:00.000Z", "files:read", "a+b"]) expect(isAuditCode(value)).toBe(true);
  });

  it("is geen zin, geen naam met een spatie, geen adres en geen lege tekst", () => {
    for (const value of ["", "Jan de Vries", "ziek gemeld tot maandag", "naam@voorbeeld.nl", "regel een\nregel twee", "tab\there", "x".repeat(121), "één"]) expect(isAuditCode(value)).toBe(false);
  });

  it("gooit bij vrije tekst, en noemt in de melding de lengte en nooit de tekst zelf", () => {
    const secretReason = "afgewezen wegens ziekte";
    expect(() => auditCode(secretReason, "reason")).toThrow(AuditContentError);
    try {
      auditCode(secretReason, "reason");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("reason");
      expect(message).toContain(String(secretReason.length));
      expect(message).not.toContain("ziekte");
    }
  });

  it("toetst elke waarde van een lijst", () => {
    expect(auditCodes(["admin", "member"])).toEqual(["admin", "member"]);
    expect(() => auditCodes(["admin", "niet goed"])).toThrow(AuditContentError);
  });
});

describe("vrije tekst in het logboek", () => {
  it("komt er alleen in als lengte, ook als hij leeg is of ontbreekt", () => {
    expect(auditLength("een reden van eenendertig tekens")).toBe(32);
    expect(auditLength("")).toBe(0);
    expect(auditLength(null)).toBe(0);
    expect(auditLength(undefined)).toBe(0);
  });
});

describe("een platte rij als feiten", () => {
  it("laat getallen, schakelaars en leeg door, toetst tekst als code en maakt van een datum zijn ISO-vorm", () => {
    expect(auditFacts({ key: "summary", enabled: true, model: null, limit: 20, roles: ["admin"], since: new Date("2026-11-18T10:00:00.000Z"), skipped: undefined })).toEqual({
      key: "summary",
      enabled: true,
      model: null,
      limit: 20,
      roles: ["admin"],
      since: "2026-11-18T10:00:00.000Z",
    });
  });

  it("gooit op een kolom met vrije tekst, en noemt de kolom", () => {
    expect(() => auditFacts({ key: "summary", note: "even bellen met de klant" })).toThrow(/note/);
  });
});

describe("de laatste controle voor het schrijven", () => {
  it("laat feiten door, ook genest en in een lijst", () => {
    expect(() => assertAuditFacts({ event: "invite", count: 3, done: false, nothing: null, roles: ["admin", "member"], inner: { status: "pending" } }, "after")).not.toThrow();
    expect(() => assertAuditFacts(undefined, "before")).not.toThrow();
  });

  it("weigert een zin, waar hij ook zit, en zegt waar", () => {
    expect(() => assertAuditFacts({ inner: { reason: "te laat ingediend" } }, "after")).toThrow(/after\.inner\.reason/);
    expect(() => assertAuditFacts({ names: ["admin", "Jan de Vries"] }, "after")).toThrow(AuditContentError);
  });

  it("weigert wat geen feit is: een datumobject, een getal dat geen getal is, en te diep nesten", () => {
    expect(() => assertAuditFacts({ at: new Date() }, "after")).toThrow(AuditContentError);
    expect(() => assertAuditFacts({ n: Number.NaN }, "after")).toThrow(AuditContentError);
    expect(() => assertAuditFacts({ a: { b: { c: { d: { e: { f: 1 } } } } } }, "after")).toThrow(AuditContentError);
  });
});

describe("het type van wat een aanroeper mag meegeven", () => {
  it("laat een vaste tekst, een getal, een schakelaar en een code door", () => {
    expectTypeOf<AuditChecked<{ event: "password_reset"; count: number; on: boolean; none: null }>>().toEqualTypeOf<{ readonly event: "password_reset"; readonly count: number; readonly on: boolean; readonly none: null }>();
    expectTypeOf<AuditChecked<AuditCode>>().toEqualTypeOf<AuditCode>();
    expectTypeOf<AuditChecked<AuditFacts>>().toEqualTypeOf<AuditFacts>();
    expectTypeOf<AuditChecked<"low" | "high">>().toEqualTypeOf<"low" | "high">();
  });

  it("maakt van een tekst uit een variabele iets wat niet past", () => {
    expectTypeOf<AuditChecked<string>>().toEqualTypeOf<never>();
    expectTypeOf<AuditChecked<{ title: string }>>().toEqualTypeOf<{ readonly title: never }>();
    expectTypeOf<AuditChecked<string | null>>().toEqualTypeOf<null>();
  });
});
