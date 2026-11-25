<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 21. Een Teams-kanaal

**Wat het is.** Meldingen die een mens nú moet zien gaan naar een Teams-kanaal in plaats van naar een
postbus, via een inkomende webhook van dat kanaal. Alleen als `messaging.teams` in
`project.config.json` aan staat en er berichtsoorten zijn met kanaal `teams`. **Tijd:** een kwartier.

**Doe dit na** 20 of 20b (de module messaging staat). **Daarna kun je** soorten op Teams zetten op
Beheer, Berichten.

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| Een Teams-kanaal waarvan jij eigenaar bent of waar je Workflows mag toevoegen | De webhook hoort bij het kanaal | |
| Een tweede kanaal om in te testen, waar alleen jij en wie bouwt in zitten | Buiten productie gaat een bericht alleen naar een testkanaal, nooit naar het echte | |
| `messaging.teams: true` in de configuratie, gevolgd door `pnpm template:generate` | Anders doet de tool niets met Teams | |

## Wat je aanmaakt

| Wat | Naam | Waar de waarde heen gaat |
|---|---|---|
| Een Workflow "Post to a channel when a webhook request is received" in het echte kanaal | de naam van je project | de HTTP POST URL wordt `TEAMS_WEBHOOK_URL` (Sensitive, alleen Production) |
| Dezelfde Workflow in het testkanaal | de naam van je project met "test" erachter | de HTTP POST URL wordt `TEAMS_WEBHOOK_URL_TEST` (Sensitive, Preview; lokaal zelf in `.env.local`) |

## Stappen

1. In Teams, bij het kanaal, de drie puntjes, **Workflows**. Kies de sjabloon **Post to a channel when
   a webhook request is received**; het team en het kanaal staan al ingevuld. Opslaan geeft een
   **HTTP POST URL**. Kopieer die meteen: hij is daarna niet meer op te vragen.
   **Controle:** de workflow staat in de lijst van het kanaal.
2. Zet `TEAMS_WEBHOOK_URL` in Vercel, alleen **Production**, Sensitive, en deploy opnieuw. De tool
   leest deze variabele alleen in productie. Staat hij ook in Preview of in `.env.local`, dan gebeurt
   daar niets mee: zo kan een proefbericht nooit in het echte kanaal belanden.
   **Controle:** op productie noemt Beheer, Systeem Teams niet meer als ontbrekend.
3. Maak op dezelfde manier een workflow in het testkanaal en zet die URL in `TEAMS_WEBHOOK_URL_TEST`:
   in Vercel voor **Preview** (Sensitive), en zelf in `.env.local` (een Sensitive waarde komt niet
   mee met `vercel env pull`). Buiten productie gaat een Teams-bericht alleen daarheen. Ontbreekt de
   variabele, dan gaat er buiten productie niets uit en blijft het bericht in de outbox staan.
   **Controle:** na een nieuwe build van de preview noemt Beheer, Systeem daar Teams niet meer als
   ontbrekend.
4. `pnpm teams:test` op je laptop: één proefkaart in het **testkanaal**. Lokaal, met
   `APP_ENV=local`, gaat dit script nooit naar het echte kanaal. Kijk in het kanaal, niet op de
   console: een workflow antwoordt "geaccepteerd" op bijna elk bericht, ook op wat hij niet kan
   plaatsen.
   **Controle:** de kaart staat in het testkanaal.
5. Het echte kanaal test je na de deploy, op productie, met een echt bericht. Op **Beheer,
   Berichten** staan de soorten met kanaal Teams; zet er een aan en doe de handeling die hem
   veroorzaakt.
   **Controle:** de melding verschijnt in het echte kanaal binnen een minuut na de handeling, en
   Beheer, Berichten toont hem met status "verstuurd".

## Waarom zo

Een webhook geeft toegang tot één kanaal en is door de kanaaleigenaar in te trekken; het alternatief
(Graph) vraagt een recht dat in elk kanaal van de tenant mag schrijven. De klassieke Office
365-connectors worden uitgefaseerd, daarom een Workflow. De tool stuurt een Adaptive Card, de vorm
die deze workflow verwacht; het logboek zegt "verstuurd" zodra de workflow het bericht aannam.

Twee kanalen en twee variabelen, omdat productie de sleutel is en geen vlag voor testen. Een vlag
"dit is een test" kun je vergeten te zetten, en dan staat een proefbericht van een preview in het
kanaal van de collega's. Een variabele die alleen in productie telt, kun je niet vergeten.

## Beveiliging

- De URL is het geheim: wie hem heeft, kan in dat kanaal plaatsen, verder niets. Sensitive in Vercel.
- Het echte kanaal krijgt alleen berichten van productie. Een preview en je laptop plaatsen alleen in
  het testkanaal, en zonder testkanaal nergens.
- De workflow hoort bij het account dat hem maakte en stopt als dat account weggaat. Zet in je
  checklist wie dat is; dat is het eerste om na te kijken als de kaarten ooit stoppen.

## Kosten

Geen; Workflows zit in Microsoft 365. Stand van oktober 2026.

## Zo zie je dat het goed staat

- `pnpm teams:test` levert een kaart op in het testkanaal.
- Op productie toont Beheer, Berichten een Teams-bericht met "het Teams-kanaal" in de kolom Naar en
  status "verstuurd", en de kaart staat in het echte kanaal.

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| "TEAMS_WEBHOOK_URL ontbreekt" | Op productie: de variabele staat niet in Production, of er is daarna niet opnieuw gedeployd |
| "TEAMS_WEBHOOK_URL_TEST ontbreekt", of `pnpm teams:test` zegt "Teams is niet ingericht. Ontbreekt: TEAMS_WEBHOOK_URL_TEST." | Buiten productie telt alleen het testkanaal. Zet de variabele in Preview of in `.env.local` (stap 3), of laat het zo: dan gaat er buiten productie niets uit |
| Een Teams-bericht blijft op een preview op "wacht" staan | Met opzet, zolang `TEAMS_WEBHOOK_URL_TEST` daar ontbreekt: het bericht blijft in de outbox en gaat niet naar het echte kanaal |
| "Teams gaf status 4xx" | De URL is ingetrokken of de workflow is weg; maak een nieuwe |
| "Verstuurd" in het logboek, niets in het kanaal | De workflow accepteerde het bericht maar kon het niet plaatsen; controleer of de workflow nog aan het juiste kanaal hangt |
| De kaarten zijn opeens gestopt | Het account van de maker van de workflow is weg of gewijzigd |

## Vul in

Noteer dit in `docs/inrichting.md`, niet in dit bestand (zie `00-checklist.md`).

| Wat | Waarde |
|---|---|
| Team en kanaal | |
| Team en testkanaal | |
| Wie de workflow maakte | |
| Datum ingericht | |
