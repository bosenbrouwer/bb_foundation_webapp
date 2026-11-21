/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readText, writeText } from "../lib/files";
import { hashText, readLock } from "../lib/lock";
import { emptyLogText, parseLog, withAdopted } from "../lib/report-back/log";
import type { RunResult, Runner } from "../lib/report-back/send";
import { runReportBack } from "./report-back";

/**
 * De opdracht van begin tot eind in een nagemaakt project: alleen de bestanden die hij leest, een
 * eigen naam in de config, en een `gh` die opschrijft wat hem gevraagd wordt. De geheimenscans
 * draaien hier niet echt (die bewijst de gouden test); ze antwoorden "schoon".
 */
const source = process.cwd();
const NOW = new Date("2026-11-21T10:00:00Z");
let root = "";
let output: string[] = [];

function makeProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "terugmelden-project-"));
  for (const path of ["template/manifest.json", "template/default.project.config.json", "template/modules/core/seed/docs/SPEC.md", "docs/SPEC.md", "RELEASE-NOTES.md"]) {
    cpSync(join(source, path), join(dir, path));
  }
  const config = JSON.parse(readFileSync(join(source, "template", "default.project.config.json"), "utf8")) as { project: Record<string, unknown> };
  config.project = { ...config.project, name: "Zonnebloem Planner", shortName: "Zonnebloem", slug: "zonnebloem-planner" };
  writeText(join(dir, "project.config.json"), JSON.stringify(config, null, 2));
  const lock = JSON.parse(readFileSync(join(source, "template.lock.json"), "utf8")) as Record<string, unknown>;
  writeText(join(dir, "template.lock.json"), JSON.stringify({ ...lock, source: "https://github.com/organisatie/template.git", adopted: ["components/ui/chip.tsx"] }, null, 2));
  writeText(join(dir, "docs", "lessen-project.md"), "# Lessen\n\n## P-01 Een export brak op een puntkomma\n\n**Regel.** Altijd een BOM.\n");
  writeText(join(dir, "docs", "terugmeldingen.md"), withAdopted(emptyLogText(), { path: "components/ui/chip.tsx", date: "2026-11-20", reason: "een eigen kleur per status" }));
  writeText(join(dir, "node_modules", "secretlint", "bin", "secretlint.js"), "");
  return dir;
}

function fakeRunner(visibility = "PRIVATE"): { run: Runner; calls: string[][] } {
  const calls: string[][] = [];
  const ok = (stdout = ""): RunResult => ({ status: 0, stdout, stderr: "", failed: false });
  const run: Runner = (command, args) => {
    calls.push([command, ...args]);
    if (command !== "gh") return ok();
    if (args[0] === "--version") return ok("gh version 2.0.0");
    if (args[0] === "repo") return ok(`${visibility}\n`);
    return ok("https://github.com/organisatie/template/issues/14\n");
  };
  return { run, calls };
}

const draftPath = (): string => join(root, ".terugmelding.md");
const draft = (): string => readText(draftPath());
const consent = (): void => writeText(draftPath(), draft().replace("- [ ] Akkoord:", "- [x] Akkoord:"));

beforeEach(() => {
  root = makeProject();
  output = [];
  vi.spyOn(console, "log").mockImplementation((...parts: unknown[]) => void output.push(parts.join(" ")));
  vi.spyOn(console, "error").mockImplementation((...parts: unknown[]) => void output.push(parts.join(" ")));
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

describe("pnpm template:report-back", () => {
  it("weigert in de repo van het template zelf", () => {
    cpSync(join(source, "template", "default.project.config.json"), join(root, "project.config.json"));
    expect(runReportBack(root, [], fakeRunner().run, NOW)).toBe(1);
    expect(output.join("\n")).toContain("repo van het template zelf");
  });

  it("schrijft een melding met de les en het overgenomen bestand, en schrijft er niet overheen", () => {
    expect(runReportBack(root, [], fakeRunner().run, NOW)).toBe(0);
    expect(draft()).toContain("## Les P-01: Een export brak op een puntkomma");
    expect(draft()).toContain("## Overgenomen: components/ui/chip.tsx");
    expect(draft()).toContain("Reden (2026-11-20): een eigen kleur per status");
    expect(output.join("\n")).toContain("1 les en 1 overgenomen bestand");
    expect(runReportBack(root, [], fakeRunner().run, NOW)).toBe(1);
    expect(output.join("\n")).toContain("Er ligt al een melding klaar");
  });

  it("verstuurt niet zonder akkoord, en niet met een naam van het project erin", () => {
    runReportBack(root, [], fakeRunner().run, NOW);
    const first = fakeRunner();
    expect(runReportBack(root, ["--send"], first.run, NOW)).toBe(1);
    expect(output.join("\n")).toContain("Vink eerst het akkoord aan");
    expect(first.calls.filter((call) => call[0] === "gh")).toEqual([]);

    consent();
    writeText(draftPath(), `${draft()}\nBij Zonnebloem ging het zo.\n`);
    const second = fakeRunner();
    expect(runReportBack(root, ["--send"], second.run, NOW)).toBe(1);
    expect(output.join("\n")).toContain('"Zonnebloem"');
    expect(second.calls.filter((call) => call[0] === "gh")).toEqual([]);
  });

  it("verstuurt niet naar een openbare repo", () => {
    runReportBack(root, [], fakeRunner().run, NOW);
    consent();
    const gh = fakeRunner("PUBLIC");
    expect(runReportBack(root, ["--send"], gh.run, NOW)).toBe(1);
    expect(gh.calls.some((call) => call[1] === "issue")).toBe(false);
    expect(existsSync(draftPath())).toBe(true);
  });

  it("verstuurt naar een privérepo en legt vast wat erin zat en wat is weggehaald", () => {
    runReportBack(root, [], fakeRunner().run, NOW);
    consent();
    writeText(draftPath(), draft().replace(/## Overgenomen: components\/ui\/chip\.tsx\n\nReden[^\n]*\n/, ""));
    const gh = fakeRunner();
    expect(runReportBack(root, ["--send"], gh.run, NOW)).toBe(0);
    const create = gh.calls.find((call) => call[1] === "issue") ?? [];
    expect(create.slice(0, 7)).toEqual(["gh", "issue", "create", "--repo", "organisatie/template", "--title", "[Terugmelding] 2 punten uit een project op template " + JSON.parse(readFileSync(join(root, "template.lock.json"), "utf8")).version]);
    expect(existsSync(draftPath())).toBe(false);
    const log = parseLog(readText(join(root, "docs", "terugmeldingen.md")));
    expect(log.sent).toEqual([{ date: "2026-11-21", issue: "#14", items: ["P-01"], skipped: ["components/ui/chip.tsx"] }]);
    const entry = readLock(root)?.files["docs/terugmeldingen.md"];
    expect(entry?.hash).toBe(hashText(readText(join(root, "docs", "terugmeldingen.md"))));
    expect(entry?.seeded).toBe(true);

    expect(runReportBack(root, [], fakeRunner().run, NOW)).toBe(0);
    expect(output.join("\n")).toContain("Niets nieuws om terug te melden sinds de vorige melding (2026-11-21, #14)");
  });

  it("zegt zonder gh hoe het met de hand moet, en legt een geplakte melding vast", () => {
    runReportBack(root, [], fakeRunner().run, NOW);
    consent();
    const missing: Runner = (command) => (command === "gh" ? { status: null, stdout: "", stderr: "", failed: true } : { status: 0, stdout: "", stderr: "", failed: false });
    expect(runReportBack(root, ["--send"], missing, NOW)).toBe(1);
    expect(output.join("\n")).toContain("https://github.com/organisatie/template/issues/new?title=");

    expect(runReportBack(root, ["--sent", "abc"], missing, NOW)).toBe(1);
    expect(runReportBack(root, ["--sent", "#15"], missing, NOW)).toBe(0);
    expect(parseLog(readText(join(root, "docs", "terugmeldingen.md"))).sent[0]?.issue).toBe("#15");
    expect(existsSync(draftPath())).toBe(false);
  });

  it("weigert een onbekende optie, en --send met --sent samen", () => {
    expect(runReportBack(root, ["--verstuur"], fakeRunner().run, NOW)).toBe(1);
    expect(runReportBack(root, ["--send", "--sent", "3"], fakeRunner().run, NOW)).toBe(1);
  });
});
