/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: de instellingen van Claude Code in de repo draaien geen code en halen niets van een
 * onbekende bron.
 *
 * Wat in `.claude/settings.json` of `.mcp.json` staat, geldt voor iedereen die de repo opent. Een
 * hook, een MCP-server of een plugin uit een andere marketplace draait daarmee code op de laptop van
 * elke bouwer, met diens rechten: bij `.env.local`, de inlog van git en de Vercel CLI. Een pull
 * request of een sessie van Claude die er zo'n regel bij zet, hoort rood te worden voordat hij
 * iemand bereikt.
 *
 * Daarom een lijst van wat mag, geen lijst van wat niet mag: een nieuwe instelling van Claude Code
 * die een opdracht uitvoert, valt er vanzelf buiten. Past een instelling toch, neem deze regel dan
 * over met `pnpm template:adopt` en de reden.
 *
 * Wat de regel niet kan: tegenhouden wat iemand zelf installeert, in zijn eigen instellingen. Dat
 * kan alleen een beheerde instelling van de organisatie of de laptop (handleiding 30, besluit D34).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SETTINGS = ".claude/settings.json";
const MCP = ".mcp.json";
const OFFICIAL_MARKETPLACE = "claude-plugins-official";
const OFFICIAL_REPO = "anthropics/claude-plugins-official";

/** Wat in de projectinstellingen mag staan. Al het andere is een bevinding. */
const ALLOWED_KEYS = new Set(["$schema", "enabledPlugins", "extraKnownMarketplaces", "permissions", "enableAllProjectMcpServers", "disabledMcpjsonServers"]);
const ALLOWED_PERMISSION_KEYS = new Set(["allow", "ask", "deny", "defaultMode", "disableBypassPermissionsMode"]);

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unknownKey(key) {
  const why =
    key === "hooks"
      ? "Een hook draait een opdracht op de laptop van iedereen die de repo opent; zet hem in je eigen instellingen."
      : "Wat hier staat, geldt voor iedereen die de repo opent; zet het in je eigen instellingen, of neem deze regel over met de reden.";
  return `${SETTINGS}: "${key}" staat niet op de lijst van wat in de projectinstellingen mag. ${why}`;
}

/** De bevindingen in de tekst van `.claude/settings.json`. */
export function settingsProblems(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [`${SETTINGS} is geen geldige JSON`];
  }
  if (!isObject(parsed)) return [`${SETTINGS} is geen object`];

  const problems = [];
  for (const key of Object.keys(parsed)) {
    if (!ALLOWED_KEYS.has(key)) problems.push(unknownKey(key));
  }

  const plugins = parsed.enabledPlugins;
  if (plugins !== undefined && !isObject(plugins)) problems.push(`${SETTINGS}: enabledPlugins is geen object`);
  if (isObject(plugins)) {
    for (const [name, enabled] of Object.entries(plugins)) {
      if (enabled !== false && !name.endsWith(`@${OFFICIAL_MARKETPLACE}`)) {
        problems.push(`${SETTINGS}: de plugin "${name}" komt niet uit de officiële marketplace (${OFFICIAL_MARKETPLACE}). Een plugin draait code op de laptop van iedereen die hem installeert.`);
      }
    }
  }

  const marketplaces = parsed.extraKnownMarketplaces;
  if (marketplaces !== undefined && !isObject(marketplaces)) problems.push(`${SETTINGS}: extraKnownMarketplaces is geen object`);
  if (isObject(marketplaces)) {
    for (const [name, entry] of Object.entries(marketplaces)) {
      const source = isObject(entry) && isObject(entry.source) ? entry.source : {};
      const official = name === OFFICIAL_MARKETPLACE && source.source === "github" && source.repo === OFFICIAL_REPO && Object.keys(source).length === 2;
      if (!official) problems.push(`${SETTINGS}: de marketplace "${name}" is niet de officiële van Anthropic (github ${OFFICIAL_REPO}).`);
    }
  }

  if (parsed.enableAllProjectMcpServers !== undefined && parsed.enableAllProjectMcpServers !== false) {
    problems.push(`${SETTINGS}: enableAllProjectMcpServers keurt elke MCP-server uit de repo goed zonder het te vragen. Laat die keus bij elke persoon.`);
  }

  const permissions = parsed.permissions;
  if (permissions !== undefined && !isObject(permissions)) problems.push(`${SETTINGS}: permissions is geen object`);
  if (isObject(permissions)) {
    for (const key of Object.keys(permissions)) {
      if (!ALLOWED_PERMISSION_KEYS.has(key)) problems.push(`${SETTINGS}: permissions.${key} staat niet op de lijst van wat in de projectinstellingen mag.`);
    }
    if (permissions.defaultMode === "bypassPermissions") {
      problems.push(`${SETTINGS}: permissions.defaultMode "bypassPermissions" slaat elke vraag over, ook voor wie de repo net opent.`);
    }
  }
  return problems;
}

export function checkClaudeSettings(root, report) {
  const settings = join(root, SETTINGS);
  if (existsSync(settings)) {
    for (const problem of settingsProblems(readFileSync(settings, "utf8"))) report(problem);
  }
  if (existsSync(join(root, MCP))) {
    report(`${MCP}: een MCP-server in de repo draait bij iedereen die hem goedkeurt, met diens rechten. Voeg hem toe in je eigen instellingen (claude mcp add --scope local), of neem deze regel over met de reden.`);
  }
}
