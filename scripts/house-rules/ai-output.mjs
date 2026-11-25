/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: een bestand dat iets van de module ai toont, zet tekst nooit als HTML of markdown neer.
 *
 * **Waarom.** Wat een model zegt, is van buiten te sturen: een omschrijving, een titel of een
 * geüpload document van iemand anders kan het een webadres of een stuk HTML laten herhalen. Zet een
 * scherm dat antwoord neer met `dangerouslySetInnerHTML`, een markdown-renderer of een linkmaker,
 * dan wordt die tekst een klikbare link of erger. Tekst van het model gaat daarom altijd door
 * `PlainText` (`components/ai/plain-text.tsx`), en een verwijzing komt uit een sleutel die de code
 * kent, nooit uit het antwoord. Zie docs/modules/ai.md en les L-AI-05.
 *
 * **Wat hij bekijkt.** Elk `.tsx`-bestand dat iets uit `@/lib/ai` of `@/components/ai` importeert,
 * en elk bestand onder `components/ai/`. Zonder de module ai raakt de regel niets.
 *
 * De renderers van het template zelf (`rich-text`, `doc-view`) staan ook op de lijst: die zijn
 * veilig voor tekst van een collega, maar maken van een adres een link, en dat is hier precies wat
 * niet mag.
 */
import { lineAt } from "./files.mjs";

const AI_IMPORT = /from\s+["'](?:@\/lib\/ai(?:\/[^"']*)?|@\/components\/ai\/[^"']*)["']/;

/** Pakketten en modules die van tekst opmaak of links maken. */
const RENDERER = /from\s+["'](react-markdown|marked|markdown-it|micromark[^"']*|remark[^"']*|rehype[^"']*|dompurify|isomorphic-dompurify|html-react-parser|linkify[^"']*|@\/components\/ui\/rich-text|@\/components\/ui\/doc-view|@\/lib\/domain\/rich-text|@\/lib\/domain\/doc-markdown)["']/g;

export function checkAiOutput(rel, text, report) {
  if (!rel.endsWith(".tsx")) return;
  if (!rel.includes("components/ai/") && !AI_IMPORT.test(text)) return;

  /* Het woord in commentaar telt niet: `plain-text.tsx` legt zelf uit waarom het er niet staat. */
  const code = text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " ")).replace(/\/\/[^\n]*/g, (comment) => " ".repeat(comment.length));

  const raw = code.indexOf("dangerouslySetInnerHTML");
  if (raw !== -1) {
    report(`${rel}:${lineAt(text, raw)} dit bestand toont iets van de module ai en gebruikt dangerouslySetInnerHTML. Tekst van het model is altijd platte tekst: gebruik PlainText uit components/ai/plain-text.tsx.`);
  }
  for (const match of code.matchAll(RENDERER)) {
    report(`${rel}:${lineAt(text, match.index ?? 0)} dit bestand toont iets van de module ai en importeert ${match[1]}, dat van tekst opmaak of een link maakt. Tekst van het model is altijd platte tekst: gebruik PlainText, en haal een verwijzing uit een sleutel.`);
  }
}
