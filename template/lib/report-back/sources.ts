/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Waar een terugmelding uit bestaat. Vier bronnen, elk op een vaste plek in het project:
 *
 *   besluiten              docs/SPEC.md, de rijen die niet uit de seed van het template komen (P-D41)
 *   lessen                 docs/lessen-project.md, elke `## P-07 Titel` met de vier onderdelen
 *   overgenomen bestanden  de lock, met de reden uit docs/terugmeldingen.md
 *   losse punten           RELEASE-NOTES.md, de rubriek `### Voor het template` per versie (v2.39)
 *
 * Een kop binnen een codeblok telt niet, zodat een voorbeeld in de seed geen les wordt.
 */
import { join } from "node:path";
import { fileExists, readText } from "../files";
import { handledIds, type AdoptedReason, type ReportLog } from "./log";

export const SPEC_FILE = "docs/SPEC.md";
export const SEED_SPEC_FILE = "template/modules/core/seed/docs/SPEC.md";
export const LESSONS_FILE = "docs/lessen-project.md";
export const RELEASE_NOTES_FILE = "RELEASE-NOTES.md";
export const RUBRIC = "Voor het template";

export type ItemKind = "decision" | "lesson" | "adopted" | "release-notes";

export interface ReportItem {
  readonly id: string;
  readonly kind: ItemKind;
  readonly title: string;
  readonly body: string;
}

interface Line {
  readonly text: string;
  /** Waar binnen een codeblok (de afbakening zelf telt mee), dus geen kop. */
  readonly inFence: boolean;
}

function linesOf(text: string): Line[] {
  let inFence = false;
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => {
      const fence = /^\s*(```|~~~)/.test(line);
      const result = { text: line, inFence: inFence || fence };
      if (fence) inFence = !inFence;
      return result;
    });
}

function trimBlock(lines: readonly string[]): string {
  const copy = [...lines];
  while (copy.length > 0 && (copy[0] ?? "").trim() === "") copy.shift();
  while (copy.length > 0 && (copy[copy.length - 1] ?? "").trim() === "") copy.pop();
  return copy.join("\n");
}

function plain(markdown: string): string {
  return markdown.replace(/[*_`]/g, "").replace(/\s+/g, " ").trim();
}

function boldPart(text: string): string | undefined {
  return /\*\*(.+?)\*\*/.exec(text)?.[1];
}

interface DecisionRow {
  readonly id: string;
  readonly decision: string;
  readonly why: string;
}

export function decisionRows(specText: string): DecisionRow[] {
  const rows: DecisionRow[] = [];
  for (const line of linesOf(specText)) {
    if (line.inFence) continue;
    const match = /^\|\s*(D\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$/.exec(line.text);
    if (match !== null) rows.push({ id: match[1] ?? "", decision: match[2] ?? "", why: match[3] ?? "" });
  }
  return rows;
}

function decisionKey(decision: string): string {
  return plain(boldPart(decision) ?? decision).toLowerCase();
}

/**
 * De besluiten van het project: elke rij waarvan de vetgedrukte kern niet in de seed van het
 * template staat. Het nummer alleen zegt niets, want een project nummert verder vanaf de besluiten
 * die het bij het aanmaken kreeg, en het template ook.
 */
export function projectDecisions(specText: string, seedSpecText: string): ReportItem[] {
  const fromTemplate = new Set(decisionRows(seedSpecText).map((row) => decisionKey(row.decision)));
  return decisionRows(specText)
    .filter((row) => !fromTemplate.has(decisionKey(row.decision)))
    .map((row) => ({
      id: `P-${row.id}`,
      kind: "decision",
      title: plain(boldPart(row.decision) ?? row.decision).replace(/[.:]$/, ""),
      body: `${row.decision}\n\nWaarom, en wat het kost: ${row.why}`,
    }));
}

export function projectLessons(text: string): ReportItem[] {
  const items: ReportItem[] = [];
  let current: { id: string; title: string; body: string[] } | undefined;
  const flush = (): void => {
    if (current !== undefined) items.push({ id: current.id, kind: "lesson", title: current.title, body: trimBlock(current.body) });
  };
  for (const line of linesOf(text)) {
    const heading = line.inFence ? null : /^## (P-\d+)\s+(.+?)\s*$/.exec(line.text);
    if (heading !== null) {
      flush();
      current = { id: heading[1] ?? "", title: (heading[2] ?? "").replace(/^[:.-]\s*/, ""), body: [] };
    } else if (!line.inFence && /^#{1,2} /.test(line.text)) {
      flush();
      current = undefined;
    } else if (current !== undefined) {
      current.body.push(line.text);
    }
  }
  flush();
  return items;
}

export function releaseNoteItems(text: string): ReportItem[] {
  const items: ReportItem[] = [];
  let version: string | undefined;
  let collecting: string[] | undefined;
  const flush = (): void => {
    if (version !== undefined && collecting !== undefined) {
      const body = trimBlock(collecting);
      if (body !== "") items.push({ id: version, kind: "release-notes", title: `Uit de release notes van ${version}`, body });
    }
    collecting = undefined;
  };
  for (const line of linesOf(text)) {
    if (!line.inFence && /^#{1,3} /.test(line.text)) {
      flush();
      const versionHeading = /^## (v\d+\.\d+)\b/.exec(line.text);
      if (versionHeading !== null) version = versionHeading[1];
      else if (/^#{1,2} /.test(line.text)) version = undefined;
      if (line.text.trim() === `### ${RUBRIC}`) collecting = [];
    } else if (collecting !== undefined) {
      collecting.push(line.text);
    }
  }
  flush();
  return items;
}

export function adoptedItems(adoptedPaths: readonly string[], reasons: readonly AdoptedReason[]): ReportItem[] {
  return adoptedPaths.map((path) => {
    const reason = [...reasons].reverse().find((entry) => entry.path === path);
    return {
      id: path,
      kind: "adopted",
      title: path,
      body:
        reason === undefined
          ? "Reden: niet vastgelegd. Schrijf hier waarom het project dit bestand nodig had, of haal dit punt weg."
          : `Reden (${reason.date}): ${reason.reason}`,
    };
  });
}

function readIfExists(root: string, path: string): string {
  const full = join(root, path);
  return fileExists(full) ? readText(full) : "";
}

/** Alles wat sinds de vorige terugmelding is bijgekomen, in een vaste volgorde. */
export function collectItems(root: string, adoptedPaths: readonly string[], log: ReportLog): ReportItem[] {
  const all = [
    ...projectDecisions(readIfExists(root, SPEC_FILE), readIfExists(root, SEED_SPEC_FILE)),
    ...projectLessons(readIfExists(root, LESSONS_FILE)),
    ...adoptedItems(adoptedPaths, log.adopted),
    ...releaseNoteItems(readIfExists(root, RELEASE_NOTES_FILE)),
  ];
  const handled = handledIds(log);
  return all.filter((item) => !handled.has(item.id));
}

const WORDS: Readonly<Record<ItemKind, readonly [string, string]>> = {
  decision: ["besluit", "besluiten"],
  lesson: ["les", "lessen"],
  adopted: ["overgenomen bestand", "overgenomen bestanden"],
  "release-notes": ["versie met punten uit de release notes", "versies met punten uit de release notes"],
};

/** `2 besluiten, 1 les en 1 overgenomen bestand`. */
export function summarise(items: readonly ReportItem[]): string {
  const parts = (Object.keys(WORDS) as ItemKind[])
    .map((kind) => {
      const count = items.filter((item) => item.kind === kind).length;
      const [one, many] = WORDS[kind];
      return count === 0 ? "" : `${count} ${count === 1 ? one : many}`;
    })
    .filter((part) => part !== "");
  if (parts.length <= 1) return parts[0] ?? "niets";
  return `${parts.slice(0, -1).join(", ")} en ${parts[parts.length - 1] ?? ""}`;
}
