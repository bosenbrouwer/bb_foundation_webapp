/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De administratie van het terugmelden: `docs/terugmeldingen.md`, een bestand van het project met
 * drie delen. Woorden die nooit mee mogen, overgenomen bestanden met de reden, en wat er verstuurd
 * is. Het commando leest de lijst en de tabellen en voegt alleen rijen toe; de tekst eromheen is van
 * het project.
 */

export const LOG_FILE = "docs/terugmeldingen.md";

const NEVER_HEADING = "## Nooit in een terugmelding";
const ADOPTED_HEADING = "## Overgenomen bestanden";
const SENT_HEADING = "## Verstuurd";
const SKIPPED_PREFIX = "niet:";

export interface AdoptedReason {
  readonly path: string;
  readonly date: string;
  readonly reason: string;
}

export interface SentReport {
  readonly date: string;
  readonly issue: string;
  /** Wat erin zat: `P-D41`, `P-07`, `v2.39` of het pad van een overgenomen bestand. */
  readonly items: readonly string[];
  /** Wat bewust uit de melding is gehaald, zodat het niet bij elke volgende run terugkomt. */
  readonly skipped: readonly string[];
}

export interface ReportLog {
  readonly neverWords: readonly string[];
  readonly adopted: readonly AdoptedReason[];
  readonly sent: readonly SentReport[];
}

const ADOPTED_TABLE = ["| Pad | Datum | Reden |", "|---|---|---|"];
const SENT_TABLE = ["| Datum | Issue | Punten |", "|---|---|---|"];

/** De lege administratie, precies zoals de seed `docs/terugmeldingen.md` hem klaarzet. */
export function emptyLogText(): string {
  return [
    "# Terugmeldingen naar het template",
    "",
    "Wat dit project aan het template heeft teruggemeld, en welke bestanden van het template het heeft",
    "overgenomen en waarom. `pnpm template:report-back` leest dit bestand en zet er rijen bij; de",
    "werkwijze staat in `docs/handleiding/12-terugmelden.md`.",
    "",
    NEVER_HEADING,
    "",
    "Woorden die het commando altijd weigert, naast de namen uit `project.config.json`: een klant, een",
    "collega, een systeem of een adres dat niet naar buiten mag. Eén woord of naam per regel.",
    "",
    "- (nog niets)",
    "",
    ADOPTED_HEADING,
    "",
    '`pnpm template:adopt <pad> --reason "..."` zet hier een regel bij.',
    "",
    ...ADOPTED_TABLE,
    "",
    SENT_HEADING,
    "",
    "Na elke terugmelding een regel: welke punten erin zaten, en achter `niet:` wat er bewust uit is",
    "gelaten.",
    "",
    ...SENT_TABLE,
    "",
  ].join("\n");
}

interface Range {
  readonly start: number;
  readonly end: number;
}

function sectionRange(lines: readonly string[], heading: string): Range | undefined {
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return undefined;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^## /.test(lines[index] ?? "")) return { start, end: index };
  }
  return { start, end: lines.length };
}

function isTableLine(line: string): boolean {
  return line.trim().startsWith("|");
}

function isSeparator(line: string): boolean {
  return /^\|[\s:|-]+\|$/.test(line.trim());
}

function cellsOf(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** De rijen van de eerste tabel in een sectie, zonder de kop en de scheidingsregel. */
function tableRows(lines: readonly string[], heading: string): string[][] {
  const range = sectionRange(lines, heading);
  if (range === undefined) return [];
  const rows = lines.slice(range.start + 1, range.end).filter((line) => isTableLine(line) && !isSeparator(line));
  return rows.slice(1).map(cellsOf);
}

function splitList(text: string): string[] {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

export function parseLog(text: string): ReportLog {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  const never = sectionRange(lines, NEVER_HEADING);
  const neverWords =
    never === undefined
      ? []
      : lines
          .slice(never.start + 1, never.end)
          .map((line) => /^\s*[-*]\s+(.+?)\s*$/.exec(line)?.[1])
          .filter((word): word is string => word !== undefined && !word.startsWith("("));

  const adopted = tableRows(lines, ADOPTED_HEADING)
    .filter((cells) => (cells[0] ?? "") !== "")
    .map((cells) => ({ path: (cells[0] ?? "").replace(/`/g, ""), date: cells[1] ?? "", reason: cells[2] ?? "" }));

  const sent = tableRows(lines, SENT_HEADING)
    .filter((cells) => (cells[0] ?? "") !== "")
    .map((cells) => {
      const parts = (cells[2] ?? "").replace(/`/g, "").split(";");
      const items: string[] = [];
      const skipped: string[] = [];
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.startsWith(SKIPPED_PREFIX)) skipped.push(...splitList(trimmed.slice(SKIPPED_PREFIX.length)));
        else items.push(...splitList(trimmed));
      }
      return { date: cells[0] ?? "", issue: cells[1] ?? "", items, skipped };
    });

  return { neverWords, adopted, sent };
}

/** Alles wat al verstuurd of bewust weggelaten is. */
export function handledIds(log: ReportLog): ReadonlySet<string> {
  return new Set(log.sent.flatMap((report) => [...report.items, ...report.skipped]));
}

/** Een cel zonder pijpteken en zonder regeleinde, want beide breken de tabel. */
function cell(text: string): string {
  return text.replace(/\r?\n/g, " ").replace(/\|/g, "/").trim();
}

function appendRow(text: string, heading: string, table: readonly string[], row: readonly string[]): string {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const line = `| ${row.map(cell).join(" | ")} |`;
  const range = sectionRange(lines, heading);

  if (range === undefined) {
    while (lines.length > 0 && (lines[lines.length - 1] ?? "") === "") lines.pop();
    lines.push("", heading, "", ...table, line, "");
    return lines.join(newline);
  }

  let lastTableLine = -1;
  for (let index = range.start + 1; index < range.end; index += 1) {
    if (isTableLine(lines[index] ?? "")) lastTableLine = index;
  }
  if (lastTableLine === -1) {
    let insertAt = range.end;
    while (insertAt > range.start + 1 && (lines[insertAt - 1] ?? "") === "") insertAt -= 1;
    lines.splice(insertAt, 0, "", ...table, line);
  } else {
    lines.splice(lastTableLine + 1, 0, line);
  }
  return lines.join(newline);
}

export function withAdopted(text: string, entry: AdoptedReason): string {
  return appendRow(text, ADOPTED_HEADING, ADOPTED_TABLE, [`\`${entry.path}\``, entry.date, entry.reason]);
}

export function withSent(text: string, entry: SentReport): string {
  const items = entry.items.join(", ");
  const skipped = entry.skipped.length > 0 ? `${items === "" ? "" : "; "}${SKIPPED_PREFIX} ${entry.skipped.join(", ")}` : "";
  return appendRow(text, SENT_HEADING, SENT_TABLE, [entry.date, entry.issue, `${items}${skipped}`]);
}
