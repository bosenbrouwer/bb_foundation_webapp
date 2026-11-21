/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De melding als bestand: `.terugmelding.md` in de wortel, niet in git. De opdracht schrijft hem,
 * de mens leest hem na, haalt weg wat niet mee mag en vinkt het akkoord aan; pas dan gaat hij weg.
 * Bij het versturen leest de opdracht terug welke punten er nog in staan, zodat een weggehaald punt
 * als "niet" in de administratie komt en niet bij elke volgende run terugkeert.
 */
import type { ReportItem } from "./sources";

export const DRAFT_FILE = ".terugmelding.md";
export const TITLE_PREFIX = "[Terugmelding]";
export const CONSENT_TEXT =
  "Akkoord: dit is kennis in mijn eigen woorden, zonder code, namen of gegevens van mijn organisatie of klant. Het template mag het gebruiken, en andere deelnemers kunnen deze melding lezen.";

const INSTRUCTION = "<!-- Lees dit na en haal weg wat niet mee mag. Vink het akkoord aan en verstuur met: pnpm template:report-back --send -->";
const COLLECTED_PREFIX = "<!-- verzameld: ";

function headingFor(item: ReportItem): string {
  switch (item.kind) {
    case "decision":
      return `## Besluit ${item.id}: ${item.title}`;
    case "lesson":
      return `## Les ${item.id}: ${item.title}`;
    case "adopted":
      return `## Overgenomen: ${item.id}`;
    case "release-notes":
      return `## ${item.title}`;
  }
}

export function draftTitle(count: number, templateVersion: string): string {
  return `${TITLE_PREFIX} ${count} ${count === 1 ? "punt" : "punten"} uit een project op template ${templateVersion}`;
}

export function renderDraft(items: readonly ReportItem[], templateVersion: string): string {
  const lines = [
    INSTRUCTION,
    `${COLLECTED_PREFIX}${items.map((item) => item.id).join(", ")} -->`,
    `# ${draftTitle(items.length, templateVersion)}`,
    "",
    `- [ ] ${CONSENT_TEXT}`,
  ];
  for (const item of items) lines.push("", headingFor(item), "", item.body);
  return `${lines.join("\n")}\n`;
}

export interface Draft {
  readonly title: string;
  /** Wat in het issue komt: alles onder de titel, zonder de aanwijzingen voor wie hem naleest. */
  readonly body: string;
  readonly consented: boolean;
  readonly presentIds: readonly string[];
  readonly collectedIds: readonly string[];
}

function idOf(line: string): string | undefined {
  return (
    /^## (?:Besluit|Les) (P-D?\d+):/.exec(line)?.[1] ??
    /^## Overgenomen: (.+?)\s*$/.exec(line)?.[1] ??
    /^## Uit de release notes van (v\d+\.\d+)\s*$/.exec(line)?.[1]
  );
}

export function parseDraft(text: string): Draft | undefined {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const titleIndex = lines.findIndex((line) => line.startsWith("# "));
  if (titleIndex === -1) return undefined;
  const title = (lines[titleIndex] ?? "").slice(2).trim();

  const collectedLine = lines.find((line) => line.startsWith(COLLECTED_PREFIX)) ?? "";
  const collectedIds = collectedLine
    .slice(COLLECTED_PREFIX.length)
    .replace(/-->\s*$/, "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "");

  const rest = lines.slice(titleIndex + 1).filter((line) => !/^<!--.*-->\s*$/.test(line));
  const presentIds = rest.map(idOf).filter((id): id is string => id !== undefined);
  const consented = rest.some((line) => /^\s*[-*] \[[xX]\] Akkoord:/.test(line));

  return { title, body: `${rest.join("\n").trim()}\n`, consented, presentIds, collectedIds };
}
