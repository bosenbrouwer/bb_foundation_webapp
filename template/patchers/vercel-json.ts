/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `vercel.json`: het template zet standaardinstellingen die ontbreken (en laat ze daarna met rust) en
 * beheert zijn eigen crons. Crons van het project blijven staan; een cronpad in `template.keepCrons`
 * houdt het rooster van het project, ook als het template er een ander voorstelt.
 */
import { isPlainObject } from "../lib/dsl";
import { parseJsonObject, stringifyJson } from "../lib/json";
import type { PatchResult } from "./types";

export interface Cron {
  readonly path: string;
  readonly schedule: string;
}

export interface VercelJsonDesired {
  /** Instellingen die alleen gezet worden als ze ontbreken, zoals regions. */
  readonly defaults: Readonly<Record<string, unknown>>;
  readonly crons: readonly Cron[];
}

export interface VercelJsonResult extends PatchResult {
  readonly managedCrons: readonly string[];
}

export const VERCEL_SCHEMA_URL = "https://openapi.vercel.sh/vercel.json";

/**
 * De soorten werkbranches die geen eigen preview krijgen (`git.deploymentEnabled`, besluit D20). Elke
 * branch een preview met een eigen database-branch liep in een eerder project tegen de limiet van
 * het aantal branches aan, en de previews faalden binnen een seconde. Wat hier niet staat, rolt uit:
 * `main` en `release/next`. **Er staat bewust geen regel die alles uitzet**, zodat `main` nooit
 * per ongeluk meegaat; de patronen zijn minimatch, en een branch die op twee regels past, rolt uit
 * als een van de twee `true` is. De Ignored Build Step in Vercel blijft het tweede slot.
 */
export const NO_PREVIEW_BRANCHES: Readonly<Record<string, false>> = {
  "dependabot/**": false,
  "feature/**": false,
  "fix/**": false,
  "hotfix/**": false,
  "chore/**": false,
  "docs/**": false,
  "refactor/**": false,
  "test/**": false,
  "build/**": false,
  "ci/**": false,
  "perf/**": false,
  "style/**": false,
  "revert/**": false,
};

export function patchVercelJson(text: string, desired: VercelJsonDesired, previousCrons: readonly string[], keepCrons: readonly string[]): VercelJsonResult {
  const changes: string[] = [];
  const warnings: string[] = [];
  const json = text.trim() === "" ? { $schema: VERCEL_SCHEMA_URL } : parseJsonObject(text, "vercel.json");

  for (const [key, value] of Object.entries(desired.defaults)) {
    if (json[key] === undefined) {
      json[key] = structuredClone(value);
      changes.push(`${key} gezet op ${JSON.stringify(value)}`);
    }
  }

  const existing = Array.isArray(json.crons) ? json.crons.filter(isCron) : [];
  const desiredPaths = desired.crons.map((cron) => cron.path);

  const kept: Cron[] = [];
  for (const cron of existing) {
    if (keepCrons.includes(cron.path)) {
      kept.push(cron);
      const proposed = desired.crons.find((candidate) => candidate.path === cron.path);
      if (proposed !== undefined && proposed.schedule !== cron.schedule) {
        warnings.push(`cron ${cron.path} houdt het rooster van het project (${cron.schedule}); het template stelt ${proposed.schedule} voor (template.keepCrons)`);
      }
    } else if (desiredPaths.includes(cron.path) || previousCrons.includes(cron.path)) {
      if (!desiredPaths.includes(cron.path)) changes.push(`cron ${cron.path} verwijderd (niet meer in het template)`);
    } else {
      kept.push(cron);
    }
  }

  const managedCrons: string[] = [];
  const added: Cron[] = [];
  for (const cron of desired.crons) {
    if (kept.some((candidate) => candidate.path === cron.path)) continue;
    managedCrons.push(cron.path);
    added.push({ path: cron.path, schedule: cron.schedule });
    const before = existing.find((candidate) => candidate.path === cron.path);
    if (before === undefined) changes.push(`cron ${cron.path} toegevoegd (${cron.schedule})`);
    else if (before.schedule !== cron.schedule) changes.push(`cron ${cron.path} van ${before.schedule} naar ${cron.schedule}`);
  }

  const crons = [...kept, ...added];
  if (crons.length === 0) delete json.crons;
  else json.crons = crons;

  return { text: stringifyJson(json), changes, warnings, managedCrons };
}

function isCron(value: unknown): value is Cron {
  return isPlainObject(value) && typeof value.path === "string" && typeof value.schedule === "string";
}
