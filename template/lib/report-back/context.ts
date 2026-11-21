/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Wat elke stap van het terugmelden nodig heeft: de config van het project en de neutrale standaard
 * ernaast, de lock, en de administratie in docs/terugmeldingen.md. In de repo van het template zelf
 * (de wortel staat daar op de standaardconfig) is er niets terug te melden: daar worden meldingen
 * verwerkt, zie template/README.md.
 */
import { join } from "node:path";
import { configsEqual, readDefaultConfig } from "../apply";
import { readConfig } from "../config";
import type { ProjectConfig } from "../config-schema";
import { fileExists, readText, writeText } from "../files";
import { hashText, LOCK_FILE, readLock, writeLock, type Lock } from "../lock";
import { loadManifest } from "../manifest";
import { emptyLogText, LOG_FILE, parseLog, type ReportLog } from "./log";
import { collectItems, summarise } from "./sources";

export class ReportBackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportBackError";
  }
}

export interface ReportContext {
  readonly config: ProjectConfig;
  readonly defaults: ProjectConfig;
  readonly lock: Lock;
  readonly logText: string;
  readonly log: ReportLog;
  readonly onTemplateRepo: boolean;
}

export function readLogText(root: string): string {
  const path = join(root, LOG_FILE);
  return fileExists(path) ? readText(path) : emptyLogText();
}

/**
 * Schrijft de administratie en zet de seed in de lock zoals `apply` dat na een wijziging door het
 * project zou doen: de nieuwe hash, en vanaf de eerste wijziging van het project. Anders verandert
 * de eerstvolgende apply of update de lock, en lijkt een update die niets deed toch iets te doen.
 */
export function writeLogFile(root: string, text: string): void {
  const path = join(root, LOG_FILE);
  writeText(path, text);
  const lock = readLock(root);
  const entry = lock?.files[LOG_FILE];
  if (lock === undefined || entry === undefined || entry.class !== "seed") return;
  const hash = hashText(readText(path));
  const next = entry.seeded ? { ...entry, hash } : { ...entry, hash, seeded: true, seededIn: entry.seededIn ?? loadManifest(root).version, shippedHash: null };
  writeLock(root, { ...lock, files: { ...lock.files, [LOG_FILE]: next } });
}

export function reportContext(root: string): ReportContext {
  const manifest = loadManifest(root);
  const config = readConfig(root, manifest).config;
  if (config === undefined) throw new ReportBackError("project.config.json is niet geldig; pnpm template:validate zegt wat eraan schort.");
  const lock = readLock(root);
  if (lock === undefined) throw new ReportBackError(`${LOCK_FILE} ontbreekt; draai eerst pnpm template:apply.`);
  const defaults = readDefaultConfig(root, manifest);
  const logText = readLogText(root);
  return { config, defaults, lock, logText, log: parseLog(logText), onTemplateRepo: configsEqual(config, defaults) };
}

/**
 * Eén regel voor het slot van `template:update` en voor `template:status`, of undefined als er niets
 * openstaat. Gooit nooit: een herinnering mag een update niet laten mislukken.
 */
export function pendingReportLine(root: string): string | undefined {
  try {
    const context = reportContext(root);
    if (context.onTemplateRepo) return undefined;
    const items = collectItems(root, context.lock.adopted, context.log);
    if (items.length === 0) return undefined;
    return `Nog niet teruggemeld aan het template: ${summarise(items)}. Draai pnpm template:report-back als het template er beter van wordt.`;
  } catch {
    return undefined;
  }
}
