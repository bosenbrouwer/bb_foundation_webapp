/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm template:report-back [--send | --sent <nummer>]`: kennis uit dit project terug naar het
 * template.
 *
 *   zonder optie   verzamelt wat sinds de vorige melding is bijgekomen en schrijft .terugmelding.md
 *   --send         controleert de melding opnieuw en zet hem met gh als issue bij het template
 *   --sent <n>     legt vast dat je de melding zelf als issue n hebt geplakt (zonder gh)
 *
 * Er gaat nooit iets weg zonder dat een mens de melding heeft nagelezen en het akkoord heeft
 * aangevinkt, en nooit naar een openbare repo. De werkwijze staat in handleiding 12.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileExists, readText, writeText } from "../lib/files";
import { todayIn } from "../lib/placeholders";
import { reportContext, ReportBackError, writeLogFile, type ReportContext } from "../lib/report-back/context";
import { CONSENT_TEXT, DRAFT_FILE, parseDraft, renderDraft, TITLE_PREFIX, type Draft } from "../lib/report-back/draft";
import { LOG_FILE, withSent } from "../lib/report-back/log";
import { forbiddenNames, neutralityProblems } from "../lib/report-back/neutral";
import { githubRepo, newIssueUrl, sendIssue, spawnRunner, type Runner } from "../lib/report-back/send";
import { collectItems, summarise } from "../lib/report-back/sources";

const USAGE = "Gebruik: pnpm template:report-back [--send | --sent <nummer>]";

interface Options {
  readonly send: boolean;
  readonly sent: { readonly value: string | undefined } | undefined;
  readonly unknown: readonly string[];
}

function parseArgs(args: readonly string[]): Options {
  let send = false;
  let sent: { value: string | undefined } | undefined;
  const unknown: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index] ?? "";
    if (argument === "--send") send = true;
    else if (argument === "--sent") {
      sent = { value: args[index + 1] };
      index += 1;
    } else if (argument.startsWith("--sent=")) sent = { value: argument.slice("--sent=".length) };
    else unknown.push(argument);
  }
  return { send, sent, unknown };
}

export function runReportBack(root: string, args: readonly string[], run: Runner = spawnRunner(root), now: Date = new Date()): number {
  const options = parseArgs(args);
  if (options.unknown.length > 0 || (options.send && options.sent !== undefined)) {
    console.error(`${options.unknown.length > 0 ? `Onbekende optie: ${options.unknown.join(", ")}. ` : ""}${USAGE}`);
    return 1;
  }

  let context: ReportContext;
  try {
    context = reportContext(root);
  } catch (error) {
    if (error instanceof ReportBackError) {
      console.error(error.message);
      return 1;
    }
    throw error;
  }
  if (context.onTemplateRepo) {
    console.error("Dit is de repo van het template zelf: terugmelden doe je vanuit een project. Hoe meldingen hier worden verwerkt, staat in template/README.md.");
    return 1;
  }

  if (options.sent !== undefined) return recordManual(root, context, options.sent.value, now);
  if (options.send) return sendDraft(root, context, run, now);
  return writeDraft(root, context, run);
}

function writeDraft(root: string, context: ReportContext, run: Runner): number {
  const draftPath = join(root, DRAFT_FILE);
  if (fileExists(draftPath)) {
    console.error(`Er ligt al een melding klaar in ${DRAFT_FILE}. Verstuur hem met pnpm template:report-back --send, of haal het bestand weg om opnieuw te beginnen.`);
    return 1;
  }

  const items = collectItems(root, context.lock.adopted, context.log);
  if (items.length === 0) {
    const last = context.log.sent[context.log.sent.length - 1];
    console.log(`Niets nieuws om terug te melden${last === undefined ? "" : ` sinds de vorige melding (${last.date}, ${last.issue})`}.`);
    console.log("Een les schrijf je in docs/lessen-project.md, een punt voor het template onder ### Voor het template in RELEASE-NOTES.md.");
    return 0;
  }

  writeText(draftPath, renderDraft(items, context.lock.version));
  console.log(`Verzameld sinds de vorige melding: ${summarise(items)}.`);
  for (const item of items) console.log(`  ${item.id.padEnd(12)} ${item.title}`);
  console.log(`\nGeschreven: ${DRAFT_FILE} (niet in git).`);

  const problems = problemsIn(root, context, readText(draftPath), run);
  if (problems.length > 0) {
    console.log("\nHaal dit weg of maak het algemeen voordat je verstuurt:");
    for (const problem of problems) console.log(`  ${problem}`);
  } else {
    console.log("Neutraal: geen namen uit project.config.json of de lijst, geen adressen, geen geheimen gevonden.");
  }
  console.log("\nWat je nu doet:");
  console.log(`  1. Lees ${DRAFT_FILE} na. Haal weg wat niet mee mag; een weggehaald punt komt niet terug.`);
  console.log("  2. Vink het akkoord aan: - [x] Akkoord: ...");
  console.log("  3. Verstuur: pnpm template:report-back --send");
  return 0;
}

function readDraft(root: string): Draft | string {
  const draftPath = join(root, DRAFT_FILE);
  if (!fileExists(draftPath)) return `Er ligt geen melding klaar. Draai eerst pnpm template:report-back.`;
  const draft = parseDraft(readText(draftPath));
  if (draft === undefined || !draft.title.startsWith(TITLE_PREFIX)) return `${DRAFT_FILE} heeft geen titel die met ${TITLE_PREFIX} begint. Haal het bestand weg en draai pnpm template:report-back opnieuw.`;
  if (draft.presentIds.length === 0) return `${DRAFT_FILE} bevat geen punten meer. Haal het bestand weg als er niets terug te melden is.`;
  return draft;
}

function sendDraft(root: string, context: ReportContext, run: Runner, now: Date): number {
  const draft = readDraft(root);
  if (typeof draft === "string") {
    console.error(draft);
    return 1;
  }
  if (!draft.consented) {
    console.error(`Vink eerst het akkoord aan in ${DRAFT_FILE} (- [x]). Het zegt: ${CONSENT_TEXT}`);
    return 1;
  }
  const problems = problemsIn(root, context, readText(join(root, DRAFT_FILE)), run);
  if (problems.length > 0) {
    console.error(`${DRAFT_FILE} is niet neutraal; er is niets verstuurd. Haal dit weg of maak het algemeen:`);
    for (const problem of problems) console.error(`  ${problem}`);
    return 1;
  }

  const source = context.lock.source ?? context.config.template.source ?? null;
  const repo = githubRepo(source);
  if (repo === undefined) {
    console.error(`Het adres van het template (${source ?? "niet ingesteld: template.source in project.config.json"}) is geen repo op GitHub. Plak de melding zelf en leg hem vast met pnpm template:report-back --sent <nummer>.`);
    return 1;
  }

  const temp = mkdtempSync(join(tmpdir(), "terugmelding-"));
  try {
    const bodyFile = join(temp, "melding.md");
    writeText(bodyFile, draft.body);
    const outcome = sendIssue(repo, draft.title, bodyFile, run);
    if (outcome.kind === "no-gh") {
      console.error("gh staat niet op deze computer, dus er is niets verstuurd. Zo doe je het met de hand:");
      console.error(`  1. Open ${newIssueUrl(repo, draft.title)}`);
      console.error(`  2. Plak alles van ${DRAFT_FILE} onder de titelregel in het tekstvak en verstuur.`);
      console.error("  3. Leg het nummer vast: pnpm template:report-back --sent <nummer>");
      return 1;
    }
    if (outcome.kind === "refused") {
      console.error(outcome.reason);
      return 1;
    }
    record(root, context, draft, outcome.issue, now);
    console.log(`Verstuurd als ${outcome.issue}: ${outcome.url}`);
    console.log(`${LOG_FILE} is bijgewerkt en ${DRAFT_FILE} is weg. Commit ${LOG_FILE} met je volgende wijziging.`);
    return 0;
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

function recordManual(root: string, context: ReportContext, value: string | undefined, now: Date): number {
  const number = (value ?? "").replace(/^#/, "");
  if (!/^[1-9]\d*$/.test(number)) {
    console.error(`Geef het nummer van het issue: pnpm template:report-back --sent 12`);
    return 1;
  }
  const draft = readDraft(root);
  if (typeof draft === "string") {
    console.error(draft);
    return 1;
  }
  record(root, context, draft, `#${number}`, now);
  console.log(`Vastgelegd als #${number} in ${LOG_FILE}; ${DRAFT_FILE} is weg. Commit ${LOG_FILE} met je volgende wijziging.`);
  return 0;
}

function record(root: string, context: ReportContext, draft: Draft, issue: string, now: Date): void {
  const present = new Set(draft.presentIds);
  const skipped = draft.collectedIds.filter((id) => !present.has(id));
  const date = todayIn(context.config.project.timezone, now);
  writeLogFile(root, withSent(context.logText, { date, issue, items: draft.presentIds, skipped }));
  rmSync(join(root, DRAFT_FILE), { force: true });
}

/** Namen en patronen, en daarna de twee geheimenscans van het project over het bestand op schijf. */
function problemsIn(root: string, context: ReportContext, text: string, run: Runner): string[] {
  const names = forbiddenNames(context.config, context.defaults, context.log.neverWords);
  const problems = neutralityProblems(text, names).map((problem) => `regel ${problem.line}: ${problem.what}`);
  return [...problems, ...secretFindings(root, run)];
}

/**
 * secretlint met de regels van `pnpm check:secrets`, en de huisregel `secret-patterns` voor de
 * geheimen die secretlint niet kent. Beide over het bestand zelf, en geen van beide toont de waarde.
 * Kan een scan niet draaien, dan is dat ook een weigering: niet gescand is niet schoon.
 */
function secretFindings(root: string, run: Runner): string[] {
  const findings: string[] = [];
  const secretlint = join(root, "node_modules", "secretlint", "bin", "secretlint.js");
  if (!fileExists(secretlint)) {
    findings.push("de geheimenscan kon niet draaien: secretlint ontbreekt in node_modules (pnpm install)");
  } else {
    const scan = run(process.execPath, [secretlint, "--maskSecrets", DRAFT_FILE]);
    if (scan.failed || scan.status !== 0) {
      findings.push("secretlint vindt iets dat op een geheim lijkt:");
      for (const line of scan.stdout.split(/\r?\n/).filter((entry) => entry.trim() !== "")) findings.push(`  ${line.trim()}`);
    }
  }

  const rule = join(root, "scripts", "house-rules", "secret-patterns.mjs");
  if (fileExists(rule)) {
    const code = [
      "const [rule, file] = process.argv.slice(1);",
      "const { pathToFileURL } = await import('node:url');",
      "const { readFileSync } = await import('node:fs');",
      "const { checkSecretPatterns } = await import(pathToFileURL(rule).href);",
      "const found = [];",
      `checkSecretPatterns(${JSON.stringify(DRAFT_FILE)}, readFileSync(file, 'utf8'), (message) => found.push(message));`,
      "if (found.length > 0) console.log(found.join('\\n'));",
      "process.exit(found.length > 0 ? 1 : 0);",
    ].join(" ");
    const scan = run(process.execPath, ["--input-type=module", "-e", code, rule, join(root, DRAFT_FILE)]);
    if (scan.failed || scan.status !== 0) {
      const lines = scan.stdout.split(/\r?\n/).filter((entry) => entry.trim() !== "");
      if (lines.length === 0) findings.push("de huisregel voor geheimen kon niet draaien over de melding");
      for (const line of lines) findings.push(line.trim());
    }
  }
  return findings;
}
