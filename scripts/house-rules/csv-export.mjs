/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: een CSV gaat via csv-safe.
 *
 * **Waarom.** Excel voert een cel die met =, +, - of @ begint uit als formule (CSV-injectie, les
 * L-HTTP-04). `lib/domain/csv-safe.ts` zet er een apostrof voor en regelt de BOM, de puntkomma en de
 * aanhalingstekens. Dat elke export daar doorheen gaat, was een afspraak: een export die zijn regels
 * zelf aan elkaar plakt, viel niemand op. Deze regel gaat af bij de lint.
 *
 * **Wat hij bekijkt.** Elk bronbestand, behalve tests: een antwoord met de kop `Content-Type`
 * `text/csv`, een `contentType` met die waarde, en een `Blob` van dat type. Zo'n bestand roept
 * `csvDocument`, `csvLine` of `csvField` aan. De regel kijkt per bestand: laat een functie de rijen
 * teruggeven en maak het document op de plek die het antwoord teruggeeft. Het type van een upload
 * vergelijken met `text/csv` telt niet: dat is lezen, geen schrijven.
 *
 * **Een bewuste uitzondering** (een bestand dat de bytes van een ander ongewijzigd doorgeeft, zoals
 * een opgeslagen upload) krijgt op de regel erboven het commentaar `csv:` met de reden. Zonder reden
 * telt het niet, en buiten commentaar ook niet.
 */
import { lineAt } from "./files.mjs";

const SOURCE = /\.(?:tsx?|jsx?|mjs)$/;
const SKIPPED = /(?:\.(?:test|spec)\.(?:tsx?|mjs)$|^e2e\/|^scripts\/house-rules\/)/;

const EXCEPTION = /(?:\/\*|\/\/|\*)\s*csv:\s*\p{L}/u;
const BUILDER = /\bcsv(?:Document|Line|Field)\s*\(/;

const PATTERNS = [
  [/content-?type["'`]?\s*[:,]\s*["'`]text\/csv/gi, "een antwoord als text/csv"],
  [/new\s+Blob\s*\([\s\S]{0,300}?type\s*:\s*["'`]text\/csv/gi, "een Blob als text/csv"],
];

export function checkCsvExport(rel, text, report) {
  if (!SOURCE.test(rel) || SKIPPED.test(rel)) return;
  const code = text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " ")).replace(/\/\/[^\n]*/g, (comment) => " ".repeat(comment.length));
  if (BUILDER.test(code)) return;
  for (const [pattern, name] of PATTERNS) {
    for (const match of code.matchAll(pattern)) {
      /* De plek is het einde van de vondst: daar staat het type, ook als de Blob een paar regels eerder begint. */
      const at = (match.index ?? 0) + match[0].length;
      /* De uitzondering staat in commentaar, op de regel zelf of op een van de drie regels erboven. */
      const lines = text.slice(0, at).split("\n");
      if (EXCEPTION.test(lines.slice(-4).join("\n"))) continue;
      report(`${rel}:${lineAt(text, at)} ${name} zonder csvDocument: een cel die met =, +, - of @ begint, voert Excel uit als formule. Bouw het document met csvDocument, csvLine of csvField uit lib/domain/csv-safe.ts, in het bestand dat het antwoord teruggeeft; een bestand dat alleen bytes doorgeeft, krijgt het commentaar csv: met de reden.`);
    }
  }
}
