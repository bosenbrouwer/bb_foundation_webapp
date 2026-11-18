<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Lessen: AI

Een model aanroepen vanuit de tool: wat erin gaat, wat eruit komt, wat het kost en hoe je het test
zonder de echte API. De lessen komen uit een eerder project dat een model op vier plekken gebruikt.
De module ai is waar het template ze afdwingt; de paden hieronder zijn die van de module. Eén ding
vooraf: het gesprek uit dat project is alleen tegen een nagemaakt model getest, nooit tegen het
echte. Waar een les daarop leunt, staat het erbij. De vorm van elke les staat in
[README.md](README.md).

## L-AI-01 Een antwoord naar een schema is nog steeds `unknown`

**Symptoom.** (voorkomen) Een antwoord dat het schema volgt, kan nog steeds een id noemen dat niet
bestaat of een waarde buiten de grenzen. Wat wel gebeurde: het schema zelf had grenzen die je pas
bij een fout ziet. Hoogstens zestien velden met een union-type per schema, en `minimum` en `maximum`
op een geheel getal werden geweigerd.

**Oorzaak.** Een schema belooft iets over de vorm en niets over de inhoud. Lengtes, grenzen,
aantallen en of een verwijzing bestaat, staan er niet in.

**Regel.** Behandel elk antwoord als `unknown` en laat de code toetsen: inhoud, grenzen en sleutels.
Geef het model korte sleutels in plaats van id's (`w1`, `m1`); de code zoekt het id erbij, en een
sleutel die niet bestaat, valt weg. Het model ziet nooit een id en kan er dus ook geen verzinnen. De
domeinregels gelden voor een voorstel net als voor een formulier; bij twijfel komt er geen vinkje
maar een lijst kandidaten.

**Afgedwongen door.** Module ai: `validateProposal` in `lib/ai/structure.ts` en `interpret` in
`lib/ai/run.ts`, met tests; `keyed` in `lib/ai/keys.ts` met `keys.test.ts`. De test per prompt en de
domeinregels op een voorstel zijn van het project: afspraak.

## L-AI-02 Een witte lijst zonder smokkeltest is een voornemen

**Symptoom.** (voorkomen) De module stuurde alleen de velden uit `fields` mee, maar niets bewees dat
een gegeven dat niet mee mag, ook echt wegblijft. Een veld gaat mee "omdat het toch al in het object
zat".

**Oorzaak.** Een witte lijst zegt wat je van plan bent. Of de functie die het bericht opbouwt zich
eraan houdt, weet je pas als je er iets verbodens in stopt en kijkt of het eruit komt.

**Regel.** Per prompt één pure functie die de waarden opbouwt, veld voor veld. Een test smokkelt er
verboden gegevens in (in het eerdere project een bedrag en een collega) en eist dat ze niet in het
bericht staan. Leest de prompt uit de database, dan dezelfde toets tegen de database: bouw de
context van een gewone gebruiker en bewijs dat er niets in zit van een ander of van een andere
organisatie. Die check haalt eerst de sleutel uit de omgeving, zodat een echte aanroep niet eens kan.

**Afgedwongen door.** Module ai: `outgoingText` en `smuggled` in `lib/ai/outgoing.ts` met
`outgoing.test.ts`; `pnpm check:ai`, rubriek 7, met de gevallen uit `AI_SMUGGLE_CASES` in
`scripts/check-ai.project.ts`. Die lijst is van het project: zonder gevallen bewijst de rubriek niets
(L-WERK-09).

## L-AI-03 Een afgeleid getal kan verraden wat je wegliet

**Symptoom.** (voorkomen) De context voor het model noemde per dag een norm. Verlof stond niet op de
witte lijst, maar een dagnorm verraadt een vrije dag.

**Oorzaak.** Een getal dat op zich onschuldig is, kan berekend zijn uit iets dat niet mee mag. Een
witte lijst kijkt naar velden, niet naar waar een waarde vandaan komt.

**Regel.** Vraag bij elk veld waaruit het is afgeleid. Stuur de waarde van vóór de afleiding mee (in
het eerdere project het rooster van vóór verlof en feestdag), of laat het veld weg.

**Afgedwongen door.** Alleen afspraak: de review van elke nieuwe prompt.

## L-AI-04 Tekst uit de eigen database is ook tekst van buiten

**Symptoom.** (voorkomen) Een titel, een naam, een omschrijving of een geüpload document bevat een
opdracht aan het model, of de tekens waarmee de markering om de gegevens te sluiten en te heropenen
is. In een proef met de hand in een eerder project (14 november 2026) stond in de kleine lettertjes
van een verzonnen document een verborgen opdracht; alle modellen negeerden hem en meldden hem als
verdacht.

**Oorzaak.** Wat in de database staat, is door iemand anders geschreven. Het model ziet geen verschil
tussen jouw markering en dezelfde tekens in een waarde.

**Regel.** Stapel de maatregelen. Het model krijgt geen gereedschap en geeft alleen JSON naar een
schema. Tekst van buiten verliest eerst de tekens waarmee hij de markering kan nadoen. Elke
systeemtekst zegt dat wat meegaat data is en nooit een instructie. En elke prompt die bestanden
leest, houdt een vijandig document als vaste proef. Weet wat die proef niet is: de geautomatiseerde
tests raken het model niet, dus het is een proef met de hand en geen test.

**Afgedwongen door.** Module ai: `cleanValue` en `buildUserMessage` in `lib/ai/message.ts` met
`message.test.ts`. De regel in elke instructie (`docs/modules/ai.md`, "Een prompt schrijven") en de
proef met het vijandige document zijn afspraak.

## L-AI-05 Modeltekst op het scherm is platte tekst, en een link komt uit een sleutel

**Symptoom.** (voorkomen) Een antwoord met een webadres of opmaak erin wordt op het scherm een link
waar iemand op klikt, of HTML. In het template was `ProposalView` daar niet op nagelopen, en geen
component dwong het af.

**Oorzaak.** Wat het model schrijft, is invoer van buiten (L-AI-04). Een markdown-renderer of een
linkmaker maakt van die invoer iets dat de browser uitvoert of dat een gebruiker vertrouwt.

**Regel.** Modeltekst is platte tekst: nooit `dangerouslySetInnerHTML`, nooit markdown en nooit een
linkmaker. De systeemtekst verbiedt een webadres in het antwoord, en de code maakt er hoe dan ook
geen link van. Bronnen en verwijzingen komen uit sleutels, niet uit tekst: de enige links onder een
antwoord zijn dingen die bestaan, en de code laat alleen bestaande sleutels door.

**Afgedwongen door.** Module ai: `PlainText` in `components/ai/plain-text.tsx`, gebruikt door
`ProposalView`, en de huisregel `ai-output` (`scripts/house-rules/ai-output.mjs`): een bestand dat
iets uit `@/lib/ai` of `@/components/ai` importeert, bevat geen `dangerouslySetInnerHTML` en
importeert geen markdown-renderer of linkmaker. De sleutels: `keyed` in `lib/ai/keys.ts`.

## L-AI-06 Een onbekende keuze van het model wordt de keuze die niets doet

**Symptoom.** (voorkomen) Een antwoord dat de code niet begrijpt, leidt naar een vaardigheid die
iets doet.

**Oorzaak.** Een enum in een schema is een afspraak met het model, geen garantie. Een terugval die
bij een onbekende waarde toch iets kiest, kiest iets met gevolgen.

**Regel.** Alles wat geen geldige waarde is, wordt de onschuldige keuze (`other`): een vaste tekst,
zonder tweede aanroep, en nooit een vaardigheid die iets doet.

**Afgedwongen door.** Module ai: `enumOr` in `lib/ai/keys.ts` met `keys.test.ts`; `validateProposal`
keurt een keuze buiten `options` af.

## L-AI-07 Een nagemaakt model hoort achter hetzelfde slot als de dev-login

**Symptoom.** (voorkomen) Een deploy met de vlag van het nagemaakte model aan geeft gebruikers stil
nepvoorstellen.

**Oorzaak.** Een vlag voor testen kan in een deploy belanden, net als die van de dev-login
(L-AUTH-04).

**Regel.** Het nagemaakte model werkt alleen met `APP_ENV=local`. In elke andere omgeving gooit het
bij elk gebruik, ook als de prompt uit staat, zodat een deploy met de vlag een foutpagina geeft in
plaats van nepvoorstellen. Het maakt uit de vaste structuur van de prompt een vast antwoord, dat
daarna door precies dezelfde toets gaat. Elke tekst in zo'n antwoord begint met "Nagemaakt". En zeg erbij wat het niet
bewijst: in het eerdere project is het gesprek nooit tegen het echte model gedraaid, en dat stond
als open punt in de release notes.

**Afgedwongen door.** Module ai: `aiFake` en `fakeAnswer` in `lib/ai/fake.ts` met `fake.test.ts`.
`runPrompt` gebruikt het bij `AI_FAKE=1`, het antwoord gaat door `interpret`, en in `ai_requests`
staat het model `fake`.

## L-AI-08 Elk script dat een server start, zet de sleutel van het model uitdrukkelijk leeg

**Symptoom.** (voorkomen) Een script dat een eigen server start en elke koppeling onklaar maakt, had
bij elke aanval op een action die het model aanroept een echte aanroep kunnen doen, met de
aanvalstekst erin en op eigen kosten. De sleutel stond toevallig niet lokaal. Gevonden op 17
november 2026, bij het opstellen van een feitenblad voor een overdracht.

**Oorzaak.** De sleutel van het model stond niet in de lijst van variabelen die het script onklaar
maakt. De server die het start, leest `.env.local`, en het adres van de API staat vast in de code:
niets hield een echte aanroep tegen.

**Regel.** Geen echte aanroep naar een model in een test, een check of de CI, ook niet per ongeluk.
Elk script dat een server start (de e2e, een aanvalsscript, een crawl) zet de sleutel leeg en het
nagemaakte model aan, uit één gedeelde lijst. Leeg en niet weg (L-NEXT-21).

**Afgedwongen door.** `SAFE_SERVER_ENV` in `scripts/lib/safe-server-env.ts` (`ANTHROPIC_API_KEY`
leeg, `AI_FAKE` aan), gebruikt door `playwright.config.ts`; `scripts/check-ai.ts` haalt de sleutel
uit de omgeving voor het begint. Een nieuw script dat een server start en de lijst niet gebruikt,
houdt niets tegen: afspraak.

## L-AI-09 Een onbekend model is een onbekende prijs, geen nul

**Symptoom.** (voorkomen) Een verzoek aan een model dat niet in de prijslijst staat, telt in het
verbruik als gratis.

**Oorzaak.** Een ontbrekende prijs die als nul wordt gerekend, is in het overzicht niet te
onderscheiden van een verzoek dat niets kostte.

**Regel.** Onbekend blijft onbekend. Staat het model niet in de prijslijst, dan zijn de kosten van
dat verzoek geen nul maar een eigen waarde die "weet ik niet" betekent, en het overzicht toont dat
ook zo.

**Afgedwongen door.** Module ai: `centTokens` in `lib/ai/cost.ts` geeft `null` zonder prijs, met de
test in `cost.test.ts`; Beheer, AI toont dan "onbekend" in plaats van een bedrag.

## L-AI-10 Het kleine model is niet stabiel tussen twee runs, en zijn zekerheid is geen signaal

**Symptoom.** In een meting in een eerder project kreeg het kleine model tussen twee runs op
dezelfde invoer bij 9% van zijn keuzes een ander antwoord. Het grote model gaf op de laagste
inspanning soms een leeg antwoord (3 van 151).

**Oorzaak.** Twee runs van hetzelfde model op dezelfde invoer zijn niet gelijk, en de zekerheid die
het kleine model over zichzelf meldt, zegt niet of het antwoord klopt.

**Regel.** Meet in plaats van te geloven: een testset met een waarheid, één getal, en de ruwe
antwoorden bewaard. Bouw geen doorschakeling naar een groter model op de zekerheid van het kleine.
Een leeg antwoord vraag je één keer opnieuw, een stap hoger. En zoek de winst eerst in wat je
meegeeft: eerdere beslissingen meegeven deed in die meting meer dan een zwaarder model.

**Afgedwongen door.** Alleen afspraak: patroon `ai-meten`. De module kiest geen model en schakelt
niet door; een beheerder kiest het model onder Beheer, AI.

## L-AI-11 Een gesprek bewaren is een besluit met een termijn, een leeslaag en een opruimtaak die niet uit kan

**Symptoom.** Het besluit "het gesprek wordt niet bewaard en niet gelogd" hield in een eerder project
één dag stand: een vervolgvraag zonder geheugen bleek niet te kunnen.

**Oorzaak.** Een vervolgvraag heeft geheugen nodig, en dat geheugen is opslag van wat mensen typten.

**Regel.** Neem het besluit met de prijs erbij. Een termijn (daar dertig dagen), en daarna hard weg,
geen zachte verwijdering. Een leeslaag waarin alleen de persoon zelf leest: geen recht heft dat op,
en het id van andermans gesprek geeft hetzelfde antwoord als een id dat niet bestaat. Een opruimtaak
die elke nacht draait, ook als de schakelaar van de bewaartermijnen uit staat: een belofte uit de
privacyverklaring hangt niet aan een instelling. Twee benoemde uitzonderingen: de export bij een
inzageverzoek en het anonimiseren. Bewaard worden alleen de beurten, niet de achtergrond die naar het
model ging.

**Afgedwongen door.** In het template valt er niets af te dwingen: de module bewaart geen inhoud
(besluit A4 in `docs/modules/ai.md`) en kent geen gesprek. In een project dat het bouwt: een eigen
check die de leeslaag, de opruimtaak, de export en het anonimiseren bewijst, en de privacytekst.
Patroon `ai-gesprek`.
