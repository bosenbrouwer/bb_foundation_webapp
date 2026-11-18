/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Tekst van het model, altijd als platte tekst. Zie docs/modules/ai.md ("Tekst van buiten is data")
 * en les L-AI-05.
 *
 * **Waarom dit een eigen component is.** Wat het model zegt, is van buiten te sturen: een
 * omschrijving, een titel of een geüpload document van iemand anders kan het een webadres of een
 * opdracht laten herhalen. Dus nooit `dangerouslySetInnerHTML`, nooit markdown en nooit een
 * linkmaker: React zet de tekst als tekst neer, en een `https://`-adres erin blijft een rij letters.
 * Ook voor tekst van het model die je later uit de database leest, want dat is dezelfde tekst. De
 * huisregel `ai-output` bewaakt het in elk bestand dat iets van de module toont.
 *
 * Regels en witruimte blijven staan, en een lang woord breekt af in plaats van het scherm breder te
 * maken. Een verwijzing onder een antwoord komt uit een sleutel die de code kent, nooit uit deze
 * tekst (`keyed` in `lib/ai/keys.ts`).
 */
export function PlainText({ text, className = "" }: { text: string; className?: string }) {
  return <span className={`whitespace-pre-wrap [overflow-wrap:anywhere] ${className}`.trim()}>{text}</span>;
}
