#!/usr/bin/env node
/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Controleert of er in wat naar productie gaat geen afhankelijkheid onder GPL of AGPL zit.
 *
 * Gebruik: pnpm check:licenses
 *
 * Waarom: een nieuwe afhankelijkheid, of een nieuwe versie van een oude, kan stil van licentie
 * wisselen, en dat zie je niet in een diff van `pnpm-lock.yaml`. De tool draait als dienst en stuurt
 * een clientbundel naar elke browser; AGPL vraagt dan de broncode aan elke gebruiker, GPL bij elke
 * verspreiding. Dat is een besluit en geen bijvangst van een update. Besluit D19.
 *
 * Wat telt:
 *
 *   GPL of AGPL      fout. Elke vorm: `GPL-2.0`, `GPL-2.0-only`, `GPL-3.0-or-later`, `GPL-2.0+`,
 *                    `AGPL-3.0`, `GPLv3`, ook met een `WITH`-uitzondering erachter.
 *   LGPL             mag. Die geldt voor de bibliotheek zelf en niet voor wat hem gebruikt; `sharp`
 *                    (via Next) levert libvips zo mee.
 *   onbekend         waarschuwing, geen fout: een lege of eigen licentietekst is iets om na te
 *                    lopen, niet iets om een pull request op te laten stranden.
 *
 * Een licentie is een SPDX-expressie. `A AND B` valt onder GPL als een van de twee dat doet, want
 * dan gelden ze allebei. `A OR B` alleen als elke keuze dat doet, want anders kiezen we de andere.
 *
 * Leest `pnpm licenses list --prod --json`, dus alleen `dependencies` en wat daaronder hangt, voor
 * het platform waarop het draait. Raakt geen database.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Hoe pnpm te starten, zonder shell.
 *
 * Een gebruikerspad op Windows kan een `&` bevatten, en cmd.exe leest dat als het einde van een
 * commando. Daardoor faalt elke start van `pnpm.cmd` via een shell, ook `spawnSync("pnpm", ...,
 * { shell: true })`. Dus het JavaScript van pnpm zelf, met de node die dit script draait: onder
 * `pnpm check:licenses` staat het pad in `npm_execpath`, en daarbuiten op Windows in `%APPDATA%`.
 * Op macOS en Linux (de CI) is `pnpm` gewoon een uitvoerbaar bestand.
 */
function pnpmCommand() {
  const execPath = process.env["npm_execpath"] ?? "";
  if (/pnpm\.(c|m)?js$/.test(execPath)) return { file: process.execPath, prefix: [execPath] };

  if (process.platform === "win32") {
    const appData = process.env["APPDATA"] ?? "";
    for (const name of ["pnpm.cjs", "pnpm.mjs"]) {
      const candidate = join(appData, "npm", "node_modules", "pnpm", "bin", name);
      if (appData !== "" && existsSync(candidate)) return { file: process.execPath, prefix: [candidate] };
    }
  }

  return { file: "pnpm", prefix: [] };
}

function listLicenses() {
  const { file, prefix } = pnpmCommand();
  const result = spawnSync(file, [...prefix, "licenses", "list", "--prod", "--json"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.error !== undefined) {
    console.error(`Licenties: pnpm is niet te starten (${result.error.message}).`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`Licenties: pnpm licenses list stopte met code ${result.status}.\n`);
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    console.error("Licenties: de uitvoer van pnpm licenses list is geen JSON.\n");
    console.error(result.stdout.slice(0, 2000));
    process.exit(1);
  }
}

/** Een licentie-id die onder GPL of AGPL valt. LGPL begint met een L en valt er dus buiten. */
const COPYLEFT = /^A?GPL(?:$|[-+v\d])/i;

/** Wat geen licentie is maar een verwijzing of een gat. */
const UNKNOWN = /^(?:unknown|unlicensed|none|see license in .*|custom.*)$/i;

/** Een SPDX-expressie in stukken: haakjes, `AND`, `OR`, `WITH` en de id's ertussen. */
export function tokens(expression) {
  return expression
    .replace(/[()]/g, (paren) => ` ${paren} `)
    .split(/\s+/)
    .filter((token) => token !== "");
}

/**
 * Of een expressie ons aan GPL of AGPL bindt: `true`, `false`, of `undefined` als hij niet te lezen
 * is. Recursief afdalend: OR bindt zwakker dan AND, en `WITH` hoort bij het id ervoor.
 */
export function bindsCopyleft(expression) {
  const list = tokens(expression);
  let pos = 0;

  const parseOr = () => {
    let value = parseAnd();
    while (list[pos]?.toUpperCase() === "OR") {
      pos += 1;
      const right = parseAnd();
      value = value === undefined || right === undefined ? undefined : value && right;
    }
    return value;
  };

  const parseAnd = () => {
    let value = parseTerm();
    while (list[pos]?.toUpperCase() === "AND") {
      pos += 1;
      const right = parseTerm();
      value = value === undefined || right === undefined ? undefined : value || right;
    }
    return value;
  };

  const parseTerm = () => {
    const token = list[pos];
    if (token === undefined) return undefined;
    pos += 1;

    if (token === "(") {
      const value = parseOr();
      if (list[pos] !== ")") return undefined;
      pos += 1;
      return value;
    }
    if (["AND", "OR", "WITH", ")"].includes(token.toUpperCase())) return undefined;

    /* Een uitzondering (`WITH Classpath-exception-2.0`) maakt GPL niet minder GPL: hier telt het id. */
    if (list[pos]?.toUpperCase() === "WITH") pos += 2;
    return COPYLEFT.test(token);
  };

  const value = parseOr();
  return pos === list.length ? value : undefined;
}

/** Het oordeel over één licentietekst: `copyleft`, `unknown` of `ok`. */
export function judgeLicense(license) {
  const text = String(license ?? "").trim();
  if (text === "" || UNKNOWN.test(text)) return "unknown";
  const binds = bindsCopyleft(text);
  /*
   * Niet te lezen, maar met een GPL-id erin (`GPL-3.0 License`): dan liever een fout die iemand
   * naloopt dan een waarschuwing die in de uitvoer verdwijnt.
   */
  if (binds === undefined) return tokens(text).some((token) => COPYLEFT.test(token)) ? "copyleft" : "unknown";
  return binds ? "copyleft" : "ok";
}

function main() {
  const groups = listLicenses();
  const packages = Object.entries(groups).flatMap(([group, list]) =>
    list.map((pkg) => ({
      name: pkg.name,
      versions: (pkg.versions ?? []).join(", "),
      license: String(pkg.license ?? group ?? "").trim(),
    })),
  );

  const copyleft = [];
  const unknown = [];

  for (const pkg of packages) {
    const line = `${pkg.name}@${pkg.versions}  ${pkg.license === "" ? "(geen licentie opgegeven)" : pkg.license}`;
    const verdict = judgeLicense(pkg.license);
    if (verdict === "copyleft") copyleft.push(line);
    else if (verdict === "unknown") unknown.push(line);
  }

  if (unknown.length > 0) {
    console.warn(`Licenties: ${unknown.length} pakket(ten) met een onbekende licentie, loop die na.\n`);
    for (const line of unknown.sort()) console.warn(`  ${line}`);
    console.warn("");
  }

  if (copyleft.length > 0) {
    console.error(`Licenties: ${copyleft.length} productiepakket(ten) onder GPL of AGPL.\n`);
    for (const line of copyleft.sort()) console.error(`  ${line}`);
    console.error("\nKies een ander pakket, of neem een besluit en leg het vast in docs/SPEC.md voordat dit naar productie gaat.");
    process.exit(1);
  }

  console.log(`Licenties: schoon. ${packages.length} productiepakketten, geen GPL of AGPL.`);
}

/* Alleen draaien als dit bestand het script is; de test importeert de pure functies. */
if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href.toLowerCase() === import.meta.url.toLowerCase()) main();
