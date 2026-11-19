/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: een query op een tabel van een organisatie filtert op die organisatie.
 *
 * **Waarom.** Elke tabel met domeinbetekenis draagt `organisation_id` (CLAUDE.md regel 2). In een
 * eerder project stond er dat "een laag het afdwingt", maar die laag bestond niet: het was een
 * afspraak, en een doorlichting vond queries die over alle organisaties heen lazen. Een afspraak
 * houdt tot iemand hem vergeet; deze regel maakt er iets van dat afgaat.
 *
 * **Wat hij bekijkt.** Elke `.from(tabel)`, `.update(tabel)` en `.delete(tabel)` op een tabel waarvan
 * het schema een kolom `organisationId` heeft. In dezelfde opdracht (tot de puntkomma) moet
 * `tabel.organisationId` voorkomen. Een `insert` valt erbuiten: daar dwingt de database de kolom af.
 *
 * **Een rij die je al op organisatie hebt nagekeken**, filter je toch: `and(eq(tabel.id, id),
 * eq(tabel.organisationId, actor.organisationId))`. Dat is de tweede ring, en hij kost niets.
 *
 * **Een bewuste uitzondering** (een taak die over alle organisaties loopt, een controle bij het
 * inloggen voordat de organisatie bekend is) krijgt op de regel erboven of in de opdracht zelf het
 * commentaar `organisatie:` met de reden. Zonder reden telt het niet.
 *
 * Tests, scripts, de e2e en het gereedschap van het template vallen erbuiten: die werken als
 * eigenaar tegen een wegwerpbranch of raken geen database.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { collectFiles, lineAt } from "./files.mjs";

const SCHEMA_FILE = /(?:^|\/)lib\/db\/schema\/[^/]+\.ts$/;
const CODE_FILE = /\.(?:ts|tsx)$/;
const SKIPPED = /(?:\.test\.tsx?$|^scripts\/|^e2e\/|\/e2e\/|^template\/(?:lib|cli|ci|patchers|generators)\/|\/scripts\/|\/lib\/db\/schema\/)/;
const EXCEPTION = /organisatie:\s*\p{L}/u;

/** De namen van de tabellen in dit schemabestand die een kolom `organisationId` hebben. */
export function organisationTables(text) {
  const tables = [];
  for (const match of text.matchAll(/export const (\w+) = pgTable\(/g)) {
    const start = match.index ?? 0;
    const end = text.indexOf("\n);", start);
    const block = text.slice(start, end === -1 ? text.length : end);
    if (/\borganisationId\s*:/.test(block)) tables.push(match[1]);
  }
  return tables;
}

/** De opdracht waar deze plek in staat: van de vorige puntkomma of accolade tot de volgende puntkomma op hetzelfde niveau. */
function statementAround(code, index) {
  let depth = 0;
  let end = code.length;
  for (let i = index; i < code.length; i += 1) {
    const ch = code[i];
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    else if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
      if (depth < 0) {
        end = i;
        break;
      }
    } else if (ch === ";" && depth === 0) {
      end = i;
      break;
    }
  }
  let start = index;
  while (start > 0 && code[start - 1] !== ";" && code[start - 1] !== "{" && code[start - 1] !== "}") start -= 1;
  return { start, text: code.slice(start, end) };
}

/** Per bestand: elke query op een tabel van een organisatie zonder het filter. */
export function organisationScopeRule(tables) {
  const names = [...tables].sort((a, b) => b.length - a.length);
  const pattern = names.length === 0 ? null : new RegExp(`\\.(from|update|delete)\\(\\s*(${names.join("|")})\\s*\\)`, "g");

  return function checkOrganisationScope(rel, text, report) {
    if (pattern === null || !CODE_FILE.test(rel) || SKIPPED.test(rel)) return;
    /* Commentaar telt niet als code, maar de uitzondering staat juist in commentaar: die zoeken we in de oorspronkelijke tekst. */
    const code = text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " ")).replace(/\/\/[^\n]*/g, (comment) => " ".repeat(comment.length));
    for (const match of code.matchAll(pattern)) {
      const index = match.index ?? 0;
      const table = match[2];
      const statement = statementAround(code, index);
      const filters = new RegExp(`\\b${table}\\.organisationId\\b`);
      if (filters.test(statement.text)) continue;
      /* Het filter kan in een variabele staan: `const scope = and(eq(tabel.organisationId, ...))` en dan `.where(scope)`. */
      const named = [...statement.text.matchAll(/\.where\(\s*(\w+)\s*\)/g)].map((where) => where[1]);
      const earlier = code.slice(0, statement.start);
      if (named.some((name) => [...earlier.matchAll(new RegExp(`\\bconst ${name} = `, "g"))].some((definition) => filters.test(statementAround(code, definition.index ?? 0).text)))) continue;
      /* De uitzondering: in de opdracht zelf, of op de twee regels erboven. */
      const before = text.slice(0, statement.start).split("\n").slice(-3).join("\n");
      const original = text.slice(statement.start, statement.start + statement.text.length);
      if (EXCEPTION.test(original) || EXCEPTION.test(before)) continue;
      report(
        `${rel}:${lineAt(text, index)} deze query op ${table} filtert niet op ${table}.organisationId. Zet eq(${table}.organisationId, ...) in de where, ook als de rij al is nagekeken; is het een bewuste uitzondering, zet er dan het commentaar "organisatie: <reden>" boven.`,
      );
    }
  };
}

/** De regel voor de hele repo: leest eerst de schema's, kijkt dan elk bestand na. */
export async function checkOrganisationScope(root, report) {
  const files = await collectFiles(root);
  const tables = new Set();
  for (const rel of files) {
    if (!SCHEMA_FILE.test(rel) || rel.endsWith(".test.ts")) continue;
    for (const table of organisationTables(readFileSync(join(root, rel), "utf8"))) tables.add(table);
  }
  const rule = organisationScopeRule(tables);
  for (const rel of files) {
    if (!CODE_FILE.test(rel) || SKIPPED.test(rel)) continue;
    rule(rel, readFileSync(join(root, rel), "utf8"), report);
  }
}
