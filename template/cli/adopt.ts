/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm template:adopt <pad> --reason "waarom" [--remove]`. De reden is verplicht: een overgenomen
 * bestand is het duidelijkste teken dat het template iets mist. Hij komt in docs/terugmeldingen.md
 * en gaat mee bij de volgende `pnpm template:report-back`.
 */
import { adoptFile } from "../lib/adopt";
import { readConfig } from "../lib/config";
import { readLock } from "../lib/lock";
import { loadManifest } from "../lib/manifest";
import { todayIn } from "../lib/placeholders";
import { readLogText, writeLogFile } from "../lib/report-back/context";
import { LOG_FILE, withAdopted } from "../lib/report-back/log";

const USAGE = 'Gebruik: pnpm template:adopt <pad> --reason "waarom het project dit bestand zelf nodig heeft" [--remove]';
const MAX_REASON = 300;

function parseArgs(args: readonly string[]): { path: string | undefined; reason: string | undefined; remove: boolean; unknown: string[] } {
  let path: string | undefined;
  let reason: string | undefined;
  let remove = false;
  const unknown: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index] ?? "";
    if (argument === "--remove") remove = true;
    else if (argument === "--reason") {
      reason = args[index + 1];
      index += 1;
    } else if (argument.startsWith("--reason=")) reason = argument.slice("--reason=".length);
    else if (argument.startsWith("--")) unknown.push(argument);
    else if (path === undefined) path = argument;
    else unknown.push(argument);
  }
  return { path, reason, remove, unknown };
}

export function runAdopt(root: string, args: readonly string[]): number {
  const options = parseArgs(args);
  if (options.path === undefined || options.unknown.length > 0) {
    console.error(`${options.unknown.length > 0 ? `Onbekend: ${options.unknown.join(", ")}. ` : ""}${USAGE}`);
    return 1;
  }
  const path = options.path.replace(/\\/g, "/");
  /* Een tweede keer, om de kop te herstellen, vraagt geen nieuwe reden: die staat er al. */
  const already = readLock(root)?.adopted.includes(path) ?? false;
  const reason = (options.reason ?? "").replace(/\s+/g, " ").trim();
  if (reason === "" && !already) {
    console.error(`Zeg waarom. ${USAGE}\nDe reden komt in ${LOG_FILE} en gaat mee bij de volgende terugmelding aan het template.`);
    return 1;
  }
  if (reason.length > MAX_REASON) {
    console.error(`De reden is ${reason.length} tekens; houd hem onder de ${MAX_REASON}. De uitleg zelf hoort in een les in docs/lessen-project.md.`);
    return 1;
  }

  const result = adoptFile(root, path, { remove: options.remove });

  if (reason !== "") {
    const timezone = readConfig(root, loadManifest(root)).config?.project.timezone ?? "Europe/Amsterdam";
    writeLogFile(root, withAdopted(readLogText(root), { path, date: todayIn(timezone), reason }));
  }

  if (result.removed) {
    console.log(`${result.path} is verwijderd (kopie in .template-backup/) en komt bij een update niet terug.`);
  } else {
    console.log(`${result.path} is nu van het project${result.headerChanged ? ", met de kop template-adopted" : ""}. Het template schrijft het niet meer; de lock is bijgewerkt.`);
  }
  if (reason !== "") console.log(`De reden staat in ${LOG_FILE} en gaat mee bij de volgende pnpm template:report-back.`);
  return 0;
}
