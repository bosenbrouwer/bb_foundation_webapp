#!/usr/bin/env node
/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Dwingt de huisregels af die ESLint niet ziet, omdat ze ook over CSS, SQL,
 * markdown, migraties en workflows gaan. Zie CLAUDE.md, Definition of done.
 *
 * Gebruik: pnpm lint:house, en meeliftend op pnpm lint.
 *
 * De regels van het template staan in scripts/house-rules/, één per bestand:
 *
 *   no-em-dash            geen em-dashes, nergens
 *   no-hardcoded-colour   kleuren komen uit de tokens, plus driftcontrole
 *   env-template          geen echte waarde in .env.example
 *   server-actions        een "use server"-bestand exporteert alleen functies
 *   session-first         elke server action begint met de sessie, vóór de invoer
 *   client-imports        een clientcomponent haalt geen databasecode binnen
 *   client-graph          ook niet via een omweg: de hele importboom tot een "use server"-grens
 *   subquery-columns      een kolom in een subquery staat uitgeschreven met tabelnaam
 *   same-id               een id tegen actor.id met sameId(), niet met ===
 *   secret-patterns       geen SAS, Entra-secret, webhook, PAT of sleutel als letterlijke waarde
 *   labels-size           geen labelbestand boven 600 regels; splits per domein
 *   no-config-import      project.config.json wordt nergens in de app geïmporteerd
 *   template-ownership    de kop van een bestand klopt met template.lock.json
 *   ai-output             wat de module ai toont, is platte tekst: geen HTML, markdown of linkmaker
 *   ai-imports            de module ai alleen vanuit mappen die het project noemt, nooit voor gasten
 *   raw-html              tekst is nooit HTML
 *   raw-sql               geen SQL uit tekst
 *   csv-export            een CSV gaat via csv-safe, anders voert Excel een cel uit als formule
 *   public-routes         wat zonder sessie bereikbaar is, staat op één lijst
 *   organisation-scope    een query filtert op de organisatie (nog advies)
 *   claude-settings       de instellingen van Claude Code in de repo draaien geen code en halen niets van een onbekende bron
 *
 * Eigen regels van het project staan in scripts/house-rules/project-rules.mjs, dat bij een update
 * van het template blijft staan. Een regel is een functie (rel, text, report) of (root, report).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { collectFiles } from "./house-rules/files.mjs";
import { checkNoEmDash } from "./house-rules/no-em-dash.mjs";
import { checkNoHardcodedColour, checkTokenDrift } from "./house-rules/no-hardcoded-colour.mjs";
import { checkEnvTemplate } from "./house-rules/env-template.mjs";
import { checkServerActions } from "./house-rules/server-actions.mjs";
import { checkSessionFirst } from "./house-rules/session-first.mjs";
import { checkClientImports } from "./house-rules/client-imports.mjs";
import { checkSubqueryColumns } from "./house-rules/subquery-columns.mjs";
import { checkLabelsSize } from "./house-rules/labels-size.mjs";
import { checkNoConfigImport } from "./house-rules/no-config-import.mjs";
import { checkTemplateOwnership } from "./house-rules/template-ownership.mjs";
import { checkClientGraph } from "./house-rules/client-graph.mjs";
import { checkSameId } from "./house-rules/same-id.mjs";
import { checkSecretPatterns } from "./house-rules/secret-patterns.mjs";
import { checkAiOutput } from "./house-rules/ai-output.mjs";
import { checkAiImports } from "./house-rules/ai-imports.mjs";
import { checkRawHtml } from "./house-rules/raw-html.mjs";
import { checkRawSql } from "./house-rules/raw-sql.mjs";
import { checkCsvExport } from "./house-rules/csv-export.mjs";
import { checkPublicRoutes } from "./house-rules/public-routes.mjs";
import { checkOrganisationScope } from "./house-rules/organisation-scope.mjs";
import { checkClaudeSettings } from "./house-rules/claude-settings.mjs";
import { PROJECT_PER_FILE_RULES, PROJECT_WHOLE_REPO_RULES } from "./house-rules/project-rules.mjs";

/** Regels die per bestand kijken, met de vorm (rel, text, report). */
const PER_FILE_RULES = [
  checkNoEmDash,
  checkNoHardcodedColour,
  checkServerActions,
  checkSessionFirst,
  checkClientImports,
  checkSubqueryColumns,
  checkLabelsSize,
  checkNoConfigImport,
  checkTemplateOwnership,
  checkSameId,
  checkSecretPatterns,
  checkAiOutput,
  checkAiImports,
  checkRawHtml,
  checkRawSql,
  checkCsvExport,
  ...PROJECT_PER_FILE_RULES,
];

/** Regels die over de repo als geheel gaan, met de vorm (root, report); een asynchrone regel wordt afgewacht. */
const WHOLE_REPO_RULES = [checkTokenDrift, checkEnvTemplate, checkClientGraph, checkPublicRoutes, checkClaudeSettings, ...PROJECT_WHOLE_REPO_RULES];

/**
 * Regels die nog advies zijn: ze melden, maar houden de lint niet tegen. `organisation-scope` is nieuw
 * in v1.10.0 en vindt in bestaande code plekken die elk een oordeel vragen (het filter erbij, of een
 * bewuste uitzondering met de reden). Een volgende versie maakt er een poort van, zoals bij de
 * scanners in de CI: eerst beoordelen, dan afdwingen.
 */
const ADVISORY_RULES = [checkOrganisationScope];

const root = process.cwd();
const problems = [];
const report = (message) => problems.push(message);

const files = await collectFiles(root);

for (const rel of files) {
  const text = readFileSync(join(root, rel), "utf8");
  for (const rule of PER_FILE_RULES) {
    rule(rel, text, report);
  }
}

for (const rule of WHOLE_REPO_RULES) {
  await rule(root, report);
}

const advice = [];
for (const rule of ADVISORY_RULES) {
  await rule(root, (message) => advice.push(message));
}
if (advice.length > 0) {
  const perFile = new Map();
  for (const message of advice) {
    const file = message.slice(0, message.indexOf(":"));
    perFile.set(file, (perFile.get(file) ?? 0) + 1);
  }
  const all = process.argv.includes("--advies");
  console.log(`Advies, nog geen poort: ${advice.length} keer een query zonder filter op de organisatie, in ${perFile.size} bestand(en).`);
  if (all) for (const message of advice) console.log(`  ${message}`);
  else {
    for (const [file, count] of perFile) console.log(`  ${String(count).padStart(3)}  ${file}`);
    console.log("  Elke plek met regelnummer: node scripts/lint-house-rules.mjs --advies\n");
  }
}

if (problems.length > 0) {
  console.error(`Huisregels: ${problems.length} probleem(en) gevonden.\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`Huisregels: schoon. ${files.length} bestanden gecontroleerd.`);
