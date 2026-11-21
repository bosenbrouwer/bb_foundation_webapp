/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { emptyLogText, handledIds, parseLog, withAdopted, withSent } from "./log";

describe("de administratie van het terugmelden", () => {
  it("is leeg zoals de seed hem klaarzet", () => {
    expect(parseLog(emptyLogText())).toEqual({ neverWords: [], adopted: [], sent: [] });
  });

  it("leest de woorden die nooit mee mogen, zonder de aanduiding dat er nog niets staat", () => {
    const text = emptyLogText().replace("- (nog niets)", "- Zonnebloem\n- planner.voorbeeld.nl\n* Klant B");
    expect(parseLog(text).neverWords).toEqual(["Zonnebloem", "planner.voorbeeld.nl", "Klant B"]);
  });

  it("zet een overgenomen bestand met de reden in de tabel, en leest hem terug", () => {
    const once = withAdopted(emptyLogText(), { path: "lib/db/client.ts", date: "2026-11-21", reason: "een luisteraar | op fouten\nnodig" });
    const twice = withAdopted(once, { path: "components/ui/chip.tsx", date: "2026-11-22", reason: "eigen kleur" });
    expect(parseLog(twice).adopted).toEqual([
      { path: "lib/db/client.ts", date: "2026-11-21", reason: "een luisteraar / op fouten nodig" },
      { path: "components/ui/chip.tsx", date: "2026-11-22", reason: "eigen kleur" },
    ]);
    expect(parseLog(twice).sent).toEqual([]);
  });

  it("legt een verstuurde melding vast met wat erin zat en wat bewust is weggelaten", () => {
    const text = withSent(emptyLogText(), { date: "2026-11-21", issue: "#12", items: ["P-D41", "P-07", "lib/db/client.ts"], skipped: ["v2.39"] });
    const log = parseLog(text);
    expect(log.sent).toEqual([{ date: "2026-11-21", issue: "#12", items: ["P-D41", "P-07", "lib/db/client.ts"], skipped: ["v2.39"] }]);
    expect([...handledIds(log)].sort()).toEqual(["P-07", "P-D41", "lib/db/client.ts", "v2.39"]);
  });

  it("legt ook een melding vast waarin alles is weggelaten", () => {
    const log = parseLog(withSent(emptyLogText(), { date: "2026-11-21", issue: "#13", items: [], skipped: ["P-08"] }));
    expect(log.sent[0]?.items).toEqual([]);
    expect(log.sent[0]?.skipped).toEqual(["P-08"]);
  });

  it("behoudt Windows-regeleinden en de tekst die het project eromheen schreef", () => {
    const own = emptyLogText().replace("## Verstuurd", "Een eigen alinea.\n\n## Verstuurd").replace(/\n/g, "\r\n");
    const text = withAdopted(own, { path: "a.ts", date: "2026-11-21", reason: "omdat" });
    expect(text).toContain("Een eigen alinea.\r\n");
    expect(text).not.toMatch(/[^\r]\n/);
    expect(parseLog(text).adopted).toHaveLength(1);
  });

  it("maakt een ontbrekende sectie aan in plaats van te weigeren", () => {
    const text = withSent("# Terugmeldingen\n\nAlleen een kop.\n", { date: "2026-11-21", issue: "#1", items: ["P-01"], skipped: [] });
    expect(parseLog(text).sent).toEqual([{ date: "2026-11-21", issue: "#1", items: ["P-01"], skipped: [] }]);
  });
});
