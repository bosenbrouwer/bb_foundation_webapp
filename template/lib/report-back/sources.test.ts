/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeText } from "../files";
import { emptyLogText, parseLog, withSent } from "./log";
import { adoptedItems, collectItems, projectDecisions, projectLessons, releaseNoteItems, summarise } from "./sources";

const SEED = [
  "| # | Besluit | Waarom, en wat het kost |",
  "|---|---|---|",
  "| D1 | **Dit project is gemaakt uit het template.** Meer tekst. | Omdat. |",
  "| D2 | **Eén inlogmodule per project.** | Eenvoud. |",
].join("\n");

const SPEC = [
  "## 3. Besluitenlog",
  "",
  "| # | Besluit | Waarom, en wat het kost |",
  "|---|---|---|",
  "| D1 | **Dit project is gemaakt uit het template.** Andere toelichting dan in de seed. | Omdat. |",
  "| D2 | **Eén inlogmodule per project.** | Eenvoud. |",
  "| D3 | **Uren worden per kwartier geboekt.** Het project koos dit. | Afronden één keer. |",
  "| D31 | **Een eigen D31 die toevallig botst met het template.** | Eigen reden. |",
].join("\n");

describe("de besluiten van het project", () => {
  it("laat de rijen uit de seed weg, op de kern en niet op het nummer", () => {
    const items = projectDecisions(SPEC, SEED);
    expect(items.map((item) => item.id)).toEqual(["P-D3", "P-D31"]);
    expect(items[0]?.title).toBe("Uren worden per kwartier geboekt");
    expect(items[0]?.body).toContain("Waarom, en wat het kost: Afronden één keer.");
  });
});

describe("de lessen van het project", () => {
  const LESSONS = [
    "# Lessen van dit project",
    "",
    "```markdown",
    "## P-01 Een voorbeeld in een codeblok telt niet",
    "```",
    "",
    "## P-01 Een export brak op een puntkomma",
    "",
    "**Symptoom.** Excel zette alles in één kolom.",
    "",
    "### Een tussenkop hoort bij de les",
    "",
    "```ts",
    "## geen kop, wel code",
    "```",
    "",
    "## P-02 Tweede les",
    "",
    "**Regel.** Altijd zo.",
    "",
    "## Bijlage",
    "",
    "Hoort bij geen les.",
  ].join("\n");

  it("vindt elke les buiten een codeblok, met de hele tekst tot de volgende kop", () => {
    const items = projectLessons(LESSONS);
    expect(items.map((item) => [item.id, item.title])).toEqual([
      ["P-01", "Een export brak op een puntkomma"],
      ["P-02", "Tweede les"],
    ]);
    expect(items[0]?.body).toContain("### Een tussenkop hoort bij de les");
    expect(items[0]?.body).toContain("## geen kop, wel code");
    expect(items[1]?.body).toBe("**Regel.** Altijd zo.");
  });
});

describe("de punten uit de release notes", () => {
  it("neemt per versie de rubriek Voor het template, en alleen als er iets in staat", () => {
    const notes = [
      "# Release notes",
      "",
      "## v0.03: export",
      "",
      "### Toegevoegd",
      "",
      "- Iets.",
      "",
      "### Voor het template",
      "",
      "- De CSV-download mist een BOM.",
      "",
      "### Bewijs",
      "",
      "- Getest.",
      "",
      "## v0.02",
      "",
      "### Voor het template",
      "",
      "## v0.01",
    ].join("\n");
    const items = releaseNoteItems(notes);
    expect(items).toEqual([{ id: "v0.03", kind: "release-notes", title: "Uit de release notes van v0.03", body: "- De CSV-download mist een BOM." }]);
  });
});

describe("de overgenomen bestanden", () => {
  it("geven de laatste reden, of vragen erom als hij ontbreekt", () => {
    const items = adoptedItems(
      ["lib/a.ts", "lib/b.ts"],
      [
        { path: "lib/a.ts", date: "2026-11-01", reason: "eerst" },
        { path: "lib/a.ts", date: "2026-11-20", reason: "later" },
      ],
    );
    expect(items[0]?.body).toBe("Reden (2026-11-20): later");
    expect(items[1]?.body).toMatch(/^Reden: niet vastgelegd/);
  });
});

describe("alles bij elkaar", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  it("laat weg wat al verstuurd of bewust weggelaten is", () => {
    const root = mkdtempSync(join(tmpdir(), "terugmelden-bronnen-"));
    roots.push(root);
    writeText(join(root, "docs", "SPEC.md"), SPEC);
    writeText(join(root, "template", "modules", "core", "seed", "docs", "SPEC.md"), SEED);
    writeText(join(root, "docs", "lessen-project.md"), "## P-01 Een\n\nTekst.\n\n## P-02 Twee\n\nTekst.\n");
    writeText(join(root, "RELEASE-NOTES.md"), "## v0.02\n\n### Voor het template\n\n- Punt.\n");
    const log = parseLog(withSent(emptyLogText(), { date: "2026-11-21", issue: "#3", items: ["P-D3", "P-01"], skipped: ["lib/a.ts"] }));

    const items = collectItems(root, ["lib/a.ts", "lib/b.ts"], log);
    expect(items.map((item) => item.id)).toEqual(["P-D31", "P-02", "lib/b.ts", "v0.02"]);
    expect(summarise(items)).toBe("1 besluit, 1 les, 1 overgenomen bestand en 1 versie met punten uit de release notes");
  });

  it("werkt ook als een bestand ontbreekt", () => {
    const root = mkdtempSync(join(tmpdir(), "terugmelden-leeg-"));
    roots.push(root);
    expect(collectItems(root, [], parseLog(emptyLogText()))).toEqual([]);
    expect(summarise([])).toBe("niets");
  });
});
