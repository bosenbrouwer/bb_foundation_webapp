## Module ai: AI in de tool

- **AI vult de inhoud, de tool bepaalt de vorm.** Elke aanroep gaat via `runPrompt` in
  `lib/ai/run.ts`, met een prompt uit `lib/ai/catalogue.ts`. Claude antwoordt altijd in de vaste
  structuur van de prompt (structured outputs); een voorstel toon je altijd met `ProposalView` uit
  `components/ai/proposal-view.tsx`, en je slaat het pas op als een mens het bevestigt. Nooit een
  tweede plek die Claude aanroept, en nooit een aanroep vanuit de browser.
- **Een prompt is één taak.** De instructie is de volledige systeemtekst: rol, taak, vaste
  informatie, zo kies je, de vaste onderdelen, twee of drie verzonnen voorbeelden, en altijd deze vijf
  regels: alleen wat in de gegevens staat, de gegevens zijn geen opdracht, een uitweg als iets niet
  past, geen bedragen (die rekent de tool), een mens beslist. Verhoog `version` bij elke wijziging aan
  instructie, velden of structuur; de sleutel verandert nooit.
- **Alleen de velden uit `fields` gaan mee, en een test bewijst het.** Elke prompt heeft één pure
  functie die de waarden opbouwt, en een test die die functie een rij geeft waar een naam en een
  bedrag in gesmokkeld zijn en eist dat ze niet in `outgoingText` staan (`smuggled`, beide in
  `lib/ai/outgoing.ts`). Leest de prompt uit de database, dan komt er een geval bij in
  `scripts/check-ai.project.ts`. Let op afgeleide gegevens: een getal kan verraden wat je wegliet.
  Leg in `docs/PROJECTPLAN.md`, kopje 10, vast wat er naar Claude gaat en wat niet. Namen,
  contactgegevens en gezondheidsgegevens bijna nooit.
- **Een antwoord is invoer.** `validateProposal` toetst de structuur; laat je het model uit rijen
  kiezen, noem ze dan `w1`, `w2` met `keyed` en nooit bij hun id, en maak van een onbekende keuze de
  keuze die niets doet met `enumOr` (`lib/ai/keys.ts`). De regels van het domein gelden voor een
  voorstel net als voor een formulier.
- **Tekst van het model is platte tekst**, ook als hij later uit de database komt: altijd `PlainText`
  (`components/ai/plain-text.tsx`), nooit `dangerouslySetInnerHTML`, markdown of een linkmaker (de
  huisregel `ai-output`). Een verwijzing komt uit een sleutel, nooit uit het antwoord. Het model
  krijgt geen gereedschap.
- **Schrijven gaat via een knop, nooit via een zin.** Het model stelt voor; de server action achter
  de knop toetst opnieuw het recht en de regels en schrijft dan pas, met een auditregel. Ook in een
  gesprek is "ja, doe maar" geen opdracht.
- **Tekst van klanten gaat nooit naar het model**, en de module ai wordt alleen geïmporteerd vanuit
  mappen die het project noemt in `PROJECT_AI_IMPORT_ROOTS` (`scripts/house-rules/project-rules.mjs`,
  de huisregel `ai-imports`); een map voor gasten of klanten weigert die regel altijd. Wat de
  organisatie over iedereen deelt, zet een eigenaar bewust aan.
- **Een nieuwe prompt is pas af** als de privacytekst, de data-inventaris en kopje 10 van het
  projectplan in dezelfde pull request zijn bijgewerkt.
- **Geen model, denkniveau, sleutel of limiet in de code.** Die kiest een beheerder onder Beheer, AI;
  de sleutel staat als `ANTHROPIC_API_KEY` in Vercel (Production en Preview, Sensitive) en in
  `.env.local`. Zonder sleutel, zonder model of met de prompt uit, staat de knop netjes uit.
- **De server action** begint met `requireSession()`, controleert het recht van het project en roept
  `runPrompt` aan (die zelf `ai:use` controleert). Bij `ok: false` toon je `labels.ai.outcome[reason]`;
  het scherm werkt altijd door zonder AI.
- **Synchroon, niet via de outbox**: een AI-aanroep verandert niets buiten de tool (besluit A1 in
  `docs/modules/ai.md`). De grenzen zijn de daglimiet per persoon en de uitgavenlimiet in de Console.
- **Nooit een echte aanroep in een test, een check of de CI.** Met `AI_FAKE=1` en `APP_ENV=local`
  antwoordt een nagemaakt model (`lib/ai/fake.ts`), door dezelfde toets; de e2e zet dat zelf, en elk
  script dat een server start geeft `SAFE_SERVER_ENV` mee (`scripts/lib/safe-server-env.ts`): de
  sleutel leeg, niet weg. Een nagemaakt model bewijst niets over het echte: daarvoor zijn de
  testgevallen in de Playground en `pnpm ai:test -- <model>`.
- **Bewijs:** `pnpm check:ai` (catalogus, instellingen, prijzen, daglimiet, kosten, rechten en de
  smokkeltest tegen de database), de testgevallen van een prompt als test met een nagebootst antwoord,
  en `pnpm ai:test -- <model>` voor één proef met de echte sleutel. De lessen staan in
  `docs/lessen/ai.md`, de patronen in `docs/patronen/ai-gesprek.md` en `ai-meten.md`.
