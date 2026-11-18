<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# AI meten in plaats van geloven

**Wanneer.** Een prompt waarvan de kwaliteit ertoe doet en waarvoor een waarheid bestaat: wat een
mens eerder echt besliste. Meet vóór je een zwaarder model kiest, een keten bouwt of een prompt
herschrijft.

**Het patroon.**

- **Een testset met een waarheid,** en één getal dat telt.
- **Opnieuw keuren zonder het model.** De ruwe antwoorden worden bewaard, zodat een wijziging in de
  toets of in de regels te meten is zonder een nieuwe aanroep.
- **De meting mag haar eigen antwoord niet opzoeken:** wat in de testset zit, blijft uit de
  voorbeelden die het model meekrijgt.
- **Fouten in de waarheid tellen apart** als "verklaard", anders jaag je op een getal dat niet kan.

Vier uitkomsten van zo'n meting in een eerder project, die tegen de intuïtie ingaan:

- De weg omhoog was niet het model maar de historie: eerdere beslissingen over dezelfde afzender
  meegeven deed meer dan een zwaarder model.
- Het kleine model is niet stabiel: tussen twee runs op dezelfde invoer kreeg 9% van zijn keuzes een
  ander antwoord. Zijn eigen zekerheid is geen signaal om door te schakelen naar een groter model
  (L-AI-10).
- Het grote model gaf op de laagste inspanning soms een leeg antwoord (3 van 151); de keten vraagt
  dat één keer opnieuw, een stap hoger.
- Een schema heeft grenzen die je pas bij een fout ziet: hoogstens zestien velden met een union-type
  per schema, en `minimum` en `maximum` op een geheel getal worden geweigerd. De code begrenst zelf
  (L-AI-01).

```ts
// scripts/ai-measure.ts (van het project): judge stored answers again, without calling the model
interface MeasuredCase {
  readonly truth: string; // what a person really decided
  readonly rawAnswer: string; // stored once, when the model was asked
  readonly truthIsWrong?: boolean; // explained: counted apart
}

export function measure(prompt: AiPrompt, cases: readonly MeasuredCase[]): { right: number; wrong: number; explained: number } {
  const score = { right: 0, wrong: 0, explained: 0 };
  for (const item of cases) {
    const judged = interpret(prompt, { stop_reason: "end_turn", content: [{ type: "text", text: item.rawAnswer }] });
    if (judged.proposal?.["category"] === item.truth) score.right += 1;
    else if (item.truthIsWrong === true) score.explained += 1;
    else score.wrong += 1;
  }
  return score;
}
```

**Wat het kost.** De waarheid verzamelen is handwerk. Elke ronde tegen het echte model kost tokens
en gebeurt met de hand: nooit in een test, een check of de CI. Geef het meten een eigen teller,
zodat het de limiet van de gebruikers niet opeet (in het eerdere project gepland, nog niet gebouwd).
En de testset is een tweede plek met inhoud: besluit A4 van de module (geen inhoud bewaren) gaat over
de tool, dus waar de testset staat en wat erin mag, besluit het project.

**Waar in het template.** Het template heeft geen meetscript en geen plek voor bewaarde antwoorden;
dit is hoe een project het bouwt. De bouwstenen uit de module ai: `interpret` in `lib/ai/run.ts`
(puur, keurt een bewaard antwoord precies zoals een vers), `validateProposal` in
`lib/ai/structure.ts`, de versie van de prompt en het model per verzoek in `ai_requests`, en
`pnpm ai:test -- <model>` voor één echte aanroep met de hand.
