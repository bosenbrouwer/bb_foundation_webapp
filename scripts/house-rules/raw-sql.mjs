/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: geen SQL uit tekst.
 *
 * **Waarom.** Een query via de databasebibliotheek gaat met parameters naar de database: een waarde
 * is dan nooit een stuk van de opdracht. Dat gaat mis op de plekken waar tekst zelf SQL wordt:
 * `sql.raw(...)` met iets anders dan een vaste tekst, `.unsafe(...)`, of een query die uit een
 * sjabloon met een variabele erin of uit aan elkaar geplakte tekst is gebouwd. In een eerder project
 * was dit bewezen door nalezen en een scanner; hier gaat het af bij de lint.
 *
 * **Wat hij bekijkt.** Elk bronbestand, behalve tests. `sql.raw("...")` met alleen een vaste tekst
 * mag; een naam van een tabel of kolom uit invoer toets je eerst tegen een vaste lijst
 * (`oneOf` uit `lib/domain/one-of.ts`) en zet je er dan met `sql.identifier` in. De gelabelde vorm
 * `sql` met een sjabloon is juist goed: daar wordt elke variabele een parameter.
 *
 * **Een bewuste uitzondering** (een opdracht die het schema wijzigt kent geen parameters, zoals het
 * aanmaken van een rol) krijgt op de regel erboven het commentaar `sql:` met de reden, en toetst de
 * waarden zelf voordat ze de tekst in gaan. Zonder reden telt het niet.
 */
import { lineAt } from "./files.mjs";

const SOURCE = /\.(?:tsx?|mjs)$/;
const SKIPPED = /(?:\.test\.(?:tsx?|mjs)$|^scripts\/house-rules\/)/;

const EXCEPTION = /sql:\s*\p{L}/u;

const PATTERNS = [
  /* sql.raw met iets anders dan één vaste tekst zonder variabele erin. */
  [/\bsql\.raw\(\s*(?!(?:"[^"\\]*"|'[^'\\]*'|`[^`$\\]*`)\s*\))/g, "sql.raw met iets anders dan een vaste tekst"],
  [/\.unsafe\s*\(/g, ".unsafe(...)"],
  /* Een query als sjabloon met een variabele erin, rechtstreeks aan de verbinding gegeven. */
  [/\.(?:query|execute)\(\s*`[^`]*\$\{/g, "een query uit een sjabloon met een variabele erin"],
  [/\.(?:query|execute)\(\s*(?:"[^"]*"|'[^']*')\s*\+/g, "een query uit aan elkaar geplakte tekst"],
];

export function checkRawSql(rel, text, report) {
  if (!SOURCE.test(rel) || SKIPPED.test(rel)) return;
  const code = text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " ")).replace(/\/\/[^\n]*/g, (comment) => " ".repeat(comment.length));
  for (const [pattern, name] of PATTERNS) {
    for (const match of code.matchAll(pattern)) {
      /* De uitzondering staat in commentaar, op de regel zelf of op een van de drie regels erboven. */
      const lines = text.slice(0, match.index ?? 0).split("\n");
      if (EXCEPTION.test(lines.slice(-4).join("\n"))) continue;
      report(`${rel}:${lineAt(text, match.index ?? 0)} ${name}: geen SQL uit tekst. Gebruik de databasebibliotheek met parameters; een naam uit invoer eerst tegen een vaste lijst (oneOf) en dan via sql.identifier.`);
    }
  }
}
