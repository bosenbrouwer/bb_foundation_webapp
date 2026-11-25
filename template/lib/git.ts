/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De paar git-opdrachten die de tooling nodig heeft, altijd via spawnSync met een argumentenlijst en
 * nooit via een shell: een spatie of een & in een pad doet dan niets, en een tag of URL kan geen
 * opdracht worden. Git zelf blijft van de mens; dit leest alleen, en kloont een versie naar een
 * tijdelijke map voor template:update.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface GitResult {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

export function runGit(args: readonly string[], cwd: string): GitResult {
  const result = spawnSync("git", [...args], { cwd, encoding: "utf8", shell: false });
  if (result.error !== undefined) {
    throw new Error(`git kon niet worden gestart (${result.error.message}); staat git op deze machine?`);
  }
  return { status: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
}

export function isGitRepository(root: string): boolean {
  return runGit(["rev-parse", "--is-inside-work-tree"], root).status === 0;
}

/**
 * Zijn er wijzigingen die nog niet gecommit zijn? Onbekende bestanden tellen mee.
 *
 * Eén uitzondering: `project.config.json` is het enige gewijzigde bestand en wijkt van de laatste
 * commit alleen af in `template.source`. Wie een project van vóór die regel bijwerkt, zet hem eerst
 * en draait dan meteen `pnpm template:update`; Claude doet dat zo, en commit niet zelf. Apply leest
 * de bron alleen, dus in git blijft te zien wat apply verandert.
 */
export function isWorkTreeDirty(root: string): boolean {
  const all = porcelain(root, []);
  if (all.length === 0) return false;
  const config = porcelain(root, ["--", "project.config.json"]);
  if (config.length !== all.length || config.length !== 1 || !/^( M|M |MM)/.test(config[0] ?? "")) return true;
  const committed = runGit(["show", "HEAD:./project.config.json"], root);
  if (committed.status !== 0) return true;
  return !onlyTemplateSourceChanged(committed.stdout, readFileSync(join(root, "project.config.json"), "utf8"));
}

function porcelain(root: string, pathspec: readonly string[]): string[] {
  const result = runGit(["status", "--porcelain", ...pathspec], root);
  if (result.status !== 0) throw new Error(`git status mislukte: ${result.stderr.trim()}`);
  return result.stdout.split("\n").filter((line) => line.trim() !== "");
}

/**
 * Verschillen twee versies van `project.config.json` alleen in `template.source`? Vergelijkt de
 * inhoud, niet de opmaak. Een blok `template` dat zonder de bron leeg is, telt als afwezig. Is een
 * van de twee geen geldige JSON, dan is het antwoord nee.
 */
export function onlyTemplateSourceChanged(committed: string, current: string): boolean {
  try {
    return canonical(withoutTemplateSource(JSON.parse(committed))) === canonical(withoutTemplateSource(JSON.parse(current)));
  } catch {
    return false;
  }
}

function withoutTemplateSource(config: unknown): unknown {
  if (typeof config !== "object" || config === null || Array.isArray(config)) return config;
  const { template, ...rest } = config as Record<string, unknown>;
  if (typeof template !== "object" || template === null || Array.isArray(template)) return template === undefined ? rest : { ...rest, template };
  const { source: _source, ...others } = template as Record<string, unknown>;
  return Object.keys(others).length === 0 ? rest : { ...rest, template: others };
}

function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    typeof item === "object" && item !== null && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)))
      : item,
  );
}

/** De tags uit de uitvoer van `git ls-remote --tags`, zonder de ^{}-verwijzingen. */
export function parseLsRemoteTags(stdout: string): string[] {
  const tags = new Set<string>();
  for (const line of stdout.split("\n")) {
    const match = /\trefs\/tags\/([^\s^]+)(\^\{\})?$/.exec(line.trim());
    if (match !== null && match[1] !== undefined) tags.add(match[1]);
  }
  return [...tags];
}

export function lsRemoteTags(url: string, cwd: string): string[] {
  const result = runGit(["ls-remote", "--tags", "--", url], cwd);
  if (result.status !== 0) {
    throw new Error(`De tags van ${url} konden niet worden opgehaald: ${result.stderr.trim() || "geen details"}. Heb je toegang tot de repo van het template?`);
  }
  return parseLsRemoteTags(result.stdout);
}

export function cloneTag(url: string, tag: string, destination: string, cwd: string): void {
  const result = runGit(["clone", "--quiet", "--depth", "1", "--branch", tag, "--", url, destination], cwd);
  if (result.status !== 0) {
    throw new Error(`Versie ${tag} van ${url} kon niet worden gekloond: ${result.stderr.trim() || "geen details"}`);
  }
}
