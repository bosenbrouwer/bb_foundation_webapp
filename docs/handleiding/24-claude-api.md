<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 24. De Claude API voor AI in de tool

**Wat het is.** Een sleutel uit de Claude Console waarmee de tool Claude een voorstel laat doen, in
een vaste structuur. Voor een project met de module ai. **Tijd:** drie kwartier, inclusief het
opzoeken van de prijzen.

**Doe dit na** 06. **Daarna kun je** onder Beheer, AI per prompt een model kiezen en de prompt aanzetten.

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| Een account in de Claude Console (platform.claude.com) op een adres van de organisatie, met tweestapsverificatie | De sleutel en de rekening horen bij de organisatie, niet bij een persoon | |
| Een betaalmiddel van de organisatie | De API werkt met tegoed | |
| Het bedrag dat je per maand aan AI wilt uitgeven, uit je checklist (tabel Budget) | Dat wordt de uitgavenlimiet | |
| Kopje 10 van `docs/PROJECTPLAN.md` ingevuld: wat er naar Claude gaat en wat niet | Zonder die afspraak zet je geen prompt aan | |

## Wat je aanmaakt

| Wat | Naam | Waar de waarde heen gaat |
|---|---|---|
| Een workspace in de Console | `<slug>` | nergens |
| Een uitgavenlimiet op die workspace | | nergens; het bedrag staat in je checklist |
| Een sleutel voor Vercel | `<slug>-vercel` | `ANTHROPIC_API_KEY` in Vercel, Production en Preview, Sensitive |
| Een sleutel voor lokaal werken | `<slug>-lokaal-<jouw initialen>` | `ANTHROPIC_API_KEY` in `.env.local` |
| Per model de prijs | | Beheer, AI, Prijzen |

Eén workspace per tool, niet per omgeving: productie en preview scheiden zich al via Vercel en Neon
(handleiding 09). Twee sleutels in die ene workspace, zodat je de lokale sleutel kunt intrekken zonder
dat de tool stilvalt. Deel de workspace en de sleutels niet met een andere tool of met proefcode: dan
is het plafond van de een ook dat van de ander, en trek je de een niet in zonder de ander stil te
leggen.

## Stappen

1. platform.claude.com, **Settings, Billing**: koop tegoed en zet **automatisch bijkopen uit**. Zo is
   het tegoed zelf al een plafond.
   **Controle:** het tegoed staat er en automatisch bijkopen staat uit.
2. **Settings, Workspaces, Create**: naam `<slug>`. Gebruik niet de Default Workspace: daarop kun je
   geen eigen limiet zetten.
   **Controle:** de workspace bestaat.
3. In de workspace, **Limits**: zet de **uitgavenlimiet per maand** op het bedrag uit je checklist.
   Zet er een melding onder op de helft, zodat je het ziet aankomen.
   **Controle:** de limiet staat op de workspace, niet op de organisatie.
4. In de workspace, **API keys, Create key**: naam `<slug>-vercel`. Hoort de sleutel bij een
   service account, kies dat: dan hangt hij niet aan een persoon die vertrekt. Kopieer de sleutel
   (begint met `sk-ant-`) meteen naar je wachtwoordmanager; de Console toont hem maar één keer.
   **Controle:** de sleutel staat in de lijst van de workspace `<slug>`, niet van een andere.
5. Vercel, **Settings, Environment Variables**: `ANTHROPIC_API_KEY`, **Sensitive**, voor
   **Production en Preview**. Niet voor Development: lokaal gebruik je je eigen sleutel. Deploy
   opnieuw.
   **Controle:** Beheer, Systeem toont "AI (Claude API)" met "Geen prompt staat aan", niet meer
   "ontbreekt".
6. Maak een tweede sleutel `<slug>-lokaal-<jouw initialen>` en zet hem in `.env.local` als
   `ANTHROPIC_API_KEY=...`. Een Sensitive waarde komt niet mee met `vercel env pull`, dus dit doe je
   zelf. Nooit in de chat, nooit in `.env.example`. Wil je lokaal aan de schermen werken zonder
   sleutel, sla deze stap dan over en lees "Lokaal werken zonder sleutel" hieronder; voor stap 8 heb
   je de sleutel wel nodig.
   **Controle:** `git status` toont `.env.local` niet.
7. Zoek in de Console de model-id's op (in de documentatie onder Models) en probeer je prompt eerst in
   de **Playground** met twee of drie modellen. Kies het kleinste model dat het goed doet.
   **Controle:** je weet welk model-id je gaat gebruiken.
8. `pnpm ai:test -- <model-id>`: één klein verzoek met je lokale sleutel. Gebruikt geen gegevens uit
   de tool en schrijft niets weg.
   **Controle:** "Structuur: klopt" en het verzoek staat in de Console bij **Usage**, onder de
   workspace `<slug>`.
9. Zoek op de prijspagina van Anthropic per model de prijs per miljoen tokens op, voor input en voor
   output. Vul ze in onder **Beheer, AI, Prijzen**, in dollars. Noteer de datum in
   `docs/inrichting.md` (zie Vul in): prijzen veranderen.
   **Controle:** de prijs staat in de tabel Prijzen.
10. **Beheer, AI, Prompts**: per prompt het model, het denkniveau (begin met laag) en hoeveel
    verzoeken één persoon per dag mag doen. Zet hem pas aan als kopje 10 van het projectplan klopt.
    **Controle:** de prompt staat op aan; na één verzoek in de tool staat het onder Verbruik met de
    tokens en de kosten.

## Lokaal werken zonder sleutel

Zet in `.env.local` de regel `AI_FAKE=1`, naast `APP_ENV=local` (07, stap 2). Dan antwoordt een
nagemaakt model in plaats van Claude: zonder sleutel, zonder netwerk en zonder kosten. Zo kun je een
scherm met een AI-knop bouwen en doorklikken. De prompt moet wel aan staan met een model onder
Beheer, AI; welk model daar staat, maakt voor het nagemaakte model niet uit.

**Controle:** elke tekst in het voorstel begint met "Nagemaakt", en onder Beheer, AI, Verbruik staat
het verzoek met het model `fake`. Bij Kosten staat "onbekend": een nagemaakt verzoek heeft geen prijs.

Drie dingen om te weten:

- Het werkt alleen lokaal. Staat `AI_FAKE` aan in een deploy, dan geeft een AI-knop een foutpagina
  in plaats van een nepvoorstel. Zet hem dus nooit in Vercel.
- De e2e zet het nagemaakte model zelf aan en zet de sleutel leeg, zodat een test nooit een echte
  aanroep doet, ook niet als er een sleutel in `.env.local` staat.
- Een nagemaakt model bewijst niet dat je prompt werkt. Dat doe je in de Playground (stap 7) en met
  `pnpm ai:test` (stap 8), met de echte sleutel.

## Waarom zo

De tool vraagt Claude om een voorstel in een vaste structuur en toont dat altijd met dezelfde
onderdelen; een mens bevestigt voordat iets wordt opgeslagen. Model, denkniveau en daglimiet staan in
Beheer en niet in de code, omdat ze veranderen: een nieuw model kies je zonder deploy. De prijzen vul
je zelf in, omdat de API geen prijs teruggeeft; de tool slaat bij elk verzoek de prijs van dat moment
op, zodat een latere prijswijziging het verleden niet verandert. De rekening die telt, staat in de
Console; Beheer, AI is de uitleg erbij.

De tool gebruikt de officiële SDK van Anthropic, op een vaste versie in `package.json`. Wil je die
versie verhogen: een versie die jonger is dan een week, installeert pnpm niet (`minimumReleaseAge`
in `pnpm-workspace.yaml`, tegen pakketten die net zijn gekaapt). Pin een versie die ouder is.

## Beveiliging

- De sleutel staat alleen in Vercel (Sensitive) en in `.env.local`, en bereikt de browser nooit:
  elke aanroep gaat via de server, met het recht `ai:use`.
- Alleen de velden die een prompt noemt gaan mee, als gegevens en niet als opdracht. Wat er naar
  Claude ging en wat terugkwam, bewaart de tool niet; het verbruik toont wie, wanneer, welk model en
  hoeveel tokens.
- **Tekst van klanten gaat nooit naar Claude.** De reden is juridisch en niet technisch: voor wat een
  klant aanlevert, is de organisatie verwerker, en Anthropic staat niet in de
  verwerkersvoorwaarden. Zet dus geen prompt aan die een bericht, een bestand of een omschrijving van
  een klant meestuurt. De tool helpt: `pnpm lint` weigert code die de AI-module gebruikt vanuit een
  scherm voor gasten of klanten (de huisregel `ai-imports`).
- Een prompt die gegevens van collega's meestuurt, zet de eigenaar van het project bewust aan;
  standaard staat elke prompt uit. De privacyverklaring noemt elke toepassing bij naam: wat meegaat,
  wat nooit meegaat, hoe lang het blijft en wie het leest.
- Ga ervan uit dat Claude de gegevens buiten de EU verwerkt, onder de commerciële voorwaarden van
  Anthropic. Namen, contactgegevens en gezondheidsgegevens stuur je daarom bijna nooit mee; leg vast
  wat wel, in kopje 10 van het projectplan.
- Een gelekte sleutel: intrekken in de Console, een nieuwe maken, in Vercel zetten, opnieuw deployen.
  Het verbruik in de Console laat zien of iemand anders hem gebruikte.

## Kosten

Plan: tegoed vooraf, betalen per token. Plafond: het tegoed zonder automatisch bijkopen, de
uitgavenlimiet op de workspace, en in de tool de daglimiet per persoon per prompt. Uit je checklist:
het deel voor AI. Wat een verzoek kost, zie je onder Beheer, AI; wat een model per miljoen tokens
kost, staat op de prijspagina. Stand van oktober 2026.

## Zo zie je dat het goed staat

- `pnpm ai:test -- <model-id>` zegt "Structuur: klopt".
- Beheer, Systeem toont "AI (Claude API)" groen met het aantal prompts dat aan staat.
- Beheer, AI toont de verzoeken van deze maand met kosten, en geen verzoeken "zonder prijs".

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| "De sleutel klopt niet" | De sleutel is ingetrokken, verkeerd gekopieerd of hoort bij een andere organisatie |
| "Dit model bestaat niet of is niet beschikbaar" | Een tikfout in het model-id, of het model is uitgefaseerd; kies een ander onder Beheer, AI |
| "Het is nu te druk" of de uitgavenlimiet is bereikt | De limiet van de workspace is op, of de API heeft het druk; de knop werkt later weer |
| "Je hebt het maximum voor vandaag bereikt" | De daglimiet per persoon uit Beheer, AI; dat is de bedoeling |
| Een voorstel "paste niet" | Claude antwoordde buiten de grenzen van de structuur; kijk naar de instructie en de voorbeelden van de prompt |
| De knop staat uit | Geen sleutel, geen model, of de prompt staat uit onder Beheer, AI |
| Kosten "onbekend" | Voor dat model staat nog geen prijs onder Beheer, AI, Prijzen |
| Elke tekst in een voorstel begint met "Nagemaakt" | `AI_FAKE=1` staat in `.env.local`: het nagemaakte model antwoordt. Haal de regel weg voor een echt voorstel |
| Een AI-knop geeft een foutpagina, en in de log staat "AI_FAKE staat aan, maar de omgeving is niet lokaal" | De variabele staat in Vercel, of `APP_ENV=local` ontbreekt in `.env.local`. In een deploy mag hij nooit staan: haal hem weg en deploy opnieuw |
| `pnpm install` weigert een nieuwe versie van de SDK van Anthropic | De versie is jonger dan een week (`minimumReleaseAge` in `pnpm-workspace.yaml`). Pin een versie die ouder is |

## Vul in

Noteer dit in `docs/inrichting.md`, niet in dit bestand (zie `00-checklist.md`).

| Wat | Waarde |
|---|---|
| Organisatie en workspace in de Console | |
| Uitgavenlimiet per maand en datum | |
| Sleutels (namen, niet de waarden) | |
| Gekozen model per prompt | |
| Prijzen ingevuld op | |
| Datum ingericht | |
