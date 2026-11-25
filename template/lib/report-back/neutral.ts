/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Is een terugmelding neutraal? Een melding gaat naar een repo die ook andere projecten en
 * deelnemers lezen, dus er mag geen naam in van het project, de organisatie of een klant, en geen
 * adres, sleutel of verbinding die naar een echt systeem wijst. Twee soorten controles:
 *
 *   namen     uit project.config.json, behalve waar het project nog de neutrale standaard heeft,
 *             plus de woorden onder "Nooit in een terugmelding" in docs/terugmeldingen.md
 *   patronen  een e-mailadres, een GUID, een verbindingsstring, een IP-adres, een adres bij Vercel,
 *             een endpoint van Neon, een tenant of site van Microsoft
 *
 * Geheimen vindt secretlint, met de regels van het project erbij; dat draait de opdracht zelf.
 * Een melding noemt de regel en de soort. Een naam noemen we wel, want die komt uit het eigen
 * project en je moet weten welk woord je zoekt; een gevonden adres of nummer niet.
 */
import type { ProjectConfig } from "../config-schema";

export interface NeutralityProblem {
  readonly line: number;
  readonly what: string;
}

const MIN_NAME_LENGTH = 3;

function hostOf(url: string | null): string | undefined {
  if (url === null) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

function domainOf(email: string | null | undefined): string | undefined {
  if (email === null || email === undefined) return undefined;
  const at = email.lastIndexOf("@");
  return at === -1 ? undefined : email.slice(at + 1);
}

/** Wat een project over zichzelf in de config zet, zonder wat nog op de standaard staat. */
export function forbiddenNames(config: ProjectConfig, defaults: ProjectConfig, neverWords: readonly string[]): string[] {
  const pairs: Array<readonly [string | null | undefined, string | null | undefined]> = [
    [config.project.name, defaults.project.name],
    [config.project.shortName, defaults.project.shortName],
    [config.project.slug, defaults.project.slug],
    [config.project.organisation.name, defaults.project.organisation.name],
    [config.project.organisation.mailDomain, defaults.project.organisation.mailDomain],
    [hostOf(config.project.productionUrl), hostOf(defaults.project.productionUrl)],
    [domainOf(config.project.systemEmail), domainOf(defaults.project.systemEmail)],
  ];
  const defaultNames = new Set(defaults.auth.devUsers.map((user) => user.displayName.toLowerCase()));
  for (const user of config.auth.devUsers) {
    if (!defaultNames.has(user.displayName.toLowerCase())) pairs.push([user.displayName, undefined]);
  }

  const names = new Map<string, string>();
  const add = (value: string): void => {
    const trimmed = value.trim();
    if (trimmed.length >= MIN_NAME_LENGTH && !names.has(trimmed.toLowerCase())) names.set(trimmed.toLowerCase(), trimmed);
  };
  for (const [value, standard] of pairs) {
    if (value === null || value === undefined) continue;
    if (standard !== null && standard !== undefined && value.trim().toLowerCase() === standard.trim().toLowerCase()) continue;
    add(value);
  }
  for (const word of neverWords) add(word);
  return [...names.values()];
}

const ALLOWED_MAIL_DOMAIN = /(?:^|\.)(?:example\.(?:org|com|net)|example|invalid|test|localhost)$/i;

interface Pattern {
  readonly what: string;
  readonly pattern: RegExp;
  readonly allowed?: (match: string) => boolean;
}

const PATTERNS: readonly Pattern[] = [
  {
    what: "een e-mailadres",
    pattern: /[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}/g,
    allowed: (match) => ALLOWED_MAIL_DOMAIN.test(domainOf(match) ?? ""),
  },
  {
    what: "een GUID (van een tenant, een app of een rij)",
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    allowed: (match) => /^0{8}-0{4}-/.test(match),
  },
  { what: "een verbindingsstring", pattern: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|rediss?|amqps?):\/\/\S+/gi },
  {
    what: "een IP-adres",
    pattern: /(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])/g,
    allowed: (match) => match === "127.0.0.1" || match === "0.0.0.0",
  },
  { what: "een adres bij Vercel met de naam van een project", pattern: /\b[a-z0-9-]+\.vercel\.app\b/gi },
  { what: "een endpoint van Neon", pattern: /\bep-[a-z0-9-]+\.[a-z0-9.-]*neon\.tech\b/gi },
  { what: "een tenant of site van Microsoft", pattern: /\b[a-z0-9-]+\.(?:onmicrosoft|sharepoint)\.com\b/gi },
];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let position = 0; position < index; position += 1) if (text.charCodeAt(position) === 10) line += 1;
  return line;
}

export function neutralityProblems(text: string, names: readonly string[]): NeutralityProblem[] {
  const problems: NeutralityProblem[] = [];
  for (const name of names) {
    /* Geen ReDoS: de naam is ontsnapt, dus een letterlijke tekst zonder herhaling tussen twee lookarounds. */
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(name)}(?![\\p{L}\\p{N}])`, "giu");
    for (const match of text.matchAll(pattern)) {
      problems.push({ line: lineAt(text, match.index), what: `"${name}" (een naam van het project of van de lijst in docs/terugmeldingen.md)` });
    }
  }
  for (const { what, pattern, allowed } of PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      if (allowed !== undefined && allowed(match[0])) continue;
      problems.push({ line: lineAt(text, match.index), what });
    }
  }
  return problems.sort((a, b) => a.line - b.line);
}
