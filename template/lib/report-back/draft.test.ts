/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { CONSENT_TEXT, draftTitle, parseDraft, renderDraft } from "./draft";
import type { ReportItem } from "./sources";

const ITEMS: ReportItem[] = [
  { id: "P-D41", kind: "decision", title: "Uren per kwartier", body: "**Uren per kwartier.**\n\nWaarom, en wat het kost: eenvoud." },
  { id: "P-07", kind: "lesson", title: "Een pool zonder luisteraar", body: "**Symptoom.** Het proces stopte." },
  { id: "lib/db/client.ts", kind: "adopted", title: "lib/db/client.ts", body: "Reden (2026-11-21): luisteraar." },
  { id: "v2.39", kind: "release-notes", title: "Uit de release notes van v2.39", body: "- De BOM ontbreekt." },
];

describe("de melding als bestand", () => {
  it("leest terug wat erin staat, zonder akkoord", () => {
    const draft = parseDraft(renderDraft(ITEMS, "1.10.0"));
    expect(draft?.title).toBe("[Terugmelding] 4 punten uit een project op template 1.10.0");
    expect(draft?.consented).toBe(false);
    expect(draft?.presentIds).toEqual(["P-D41", "P-07", "lib/db/client.ts", "v2.39"]);
    expect(draft?.collectedIds).toEqual(["P-D41", "P-07", "lib/db/client.ts", "v2.39"]);
  });

  it("ziet het aangevinkte akkoord en een weggehaald punt", () => {
    const text = renderDraft(ITEMS, "1.10.0")
      .replace("- [ ] Akkoord:", "- [x] Akkoord:")
      .replace("## Les P-07: Een pool zonder luisteraar\n\n**Symptoom.** Het proces stopte.\n\n", "");
    const draft = parseDraft(text);
    expect(draft?.consented).toBe(true);
    expect(draft?.presentIds).toEqual(["P-D41", "lib/db/client.ts", "v2.39"]);
    expect(draft?.collectedIds).toHaveLength(4);
  });

  it("zet in het issue het akkoord en de punten, maar niet de aanwijzingen voor wie naleest", () => {
    const draft = parseDraft(renderDraft(ITEMS, "1.10.0").replaceAll("\n", "\r\n"));
    expect(draft?.body).toContain(CONSENT_TEXT);
    expect(draft?.body).toContain("## Besluit P-D41: Uren per kwartier");
    expect(draft?.body).not.toContain("<!--");
    expect(draft?.body.startsWith("- [ ]")).toBe(true);
  });

  it("telt in de titel", () => {
    expect(draftTitle(1, "1.11.0")).toBe("[Terugmelding] 1 punt uit een project op template 1.11.0");
  });

  it("geeft niets terug zonder titel", () => {
    expect(parseDraft("geen kop\n")).toBeUndefined();
  });
});
