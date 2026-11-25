/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: tekst is nooit HTML.
 *
 * **Waarom.** Elke bibliotheek voor opmaak geeft een HTML-tekst terug, en op tekst die iemand anders
 * typte is dat precies de fout die je niet wilt maken: een script in een omschrijving draait dan in
 * de browser van wie hem leest. Het template tekent opmaak daarom als componenten uit een structuur
 * (`components/ui/rich-text.tsx`, `doc-view.tsx`) en voegt nergens ruwe HTML in. De CSP met een nonce
 * is het tweede slot; deze regel is het eerste, en hij gaat af voordat de code draait.
 *
 * **Wat hij bekijkt.** Elk bronbestand, behalve tests: `dangerouslySetInnerHTML`, een toewijzing aan
 * `innerHTML` of `outerHTML`, `insertAdjacentHTML` en `document.write`. In commentaar telt het niet.
 * Uitlezen van `innerHTML` mag, bijvoorbeeld in een test met een browser.
 */
import { lineAt } from "./files.mjs";

const SOURCE = /\.(?:tsx?|jsx?|mjs)$/;
const SKIPPED = /(?:\.test\.(?:tsx?|mjs)$|^scripts\/house-rules\/)/;

const PATTERNS = [
  [/dangerouslySetInnerHTML/g, "dangerouslySetInnerHTML"],
  [/\.(?:innerHTML|outerHTML)\s*\+?=(?!=)/g, "een toewijzing aan innerHTML of outerHTML"],
  [/\.insertAdjacentHTML\s*\(/g, "insertAdjacentHTML"],
  [/\bdocument\.write(?:ln)?\s*\(/g, "document.write"],
];

export function checkRawHtml(rel, text, report) {
  if (!SOURCE.test(rel) || SKIPPED.test(rel)) return;
  const code = text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " ")).replace(/\/\/[^\n]*/g, (comment) => " ".repeat(comment.length));
  for (const [pattern, name] of PATTERNS) {
    for (const match of code.matchAll(pattern)) {
      report(`${rel}:${lineAt(text, match.index ?? 0)} ${name}: tekst is nooit HTML. Teken opmaak als componenten uit een structuur (components/ui/rich-text.tsx), of toon de tekst als tekst.`);
    }
  }
}
