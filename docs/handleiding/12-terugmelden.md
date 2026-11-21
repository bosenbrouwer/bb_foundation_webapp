<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 12. Terugmelden aan het template

**Wat het is.** Wat je in dit project leerde, terug naar het template, zodat het volgende project
het niet opnieuw hoeft te leren. Eén opdracht verzamelt het, controleert het en zet het na jouw
akkoord als issue bij het template. **Tijd:** tien minuten per melding, vooral om na te lezen.

**Doe dit na** een paar rondes, of als `pnpm template:status` of `pnpm template:update` zegt dat
er iets openstaat. **Daarna** krijg je de verbetering met een volgende `pnpm template:update`.

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| Leesrecht op de repo van het template | Met leesrecht mag je er een issue openen | |
| De GitHub CLI (`gh`), aangemeld met `gh auth login` | Dan verstuurt de opdracht de melding zelf; zonder `gh` plak je hem met de hand | |
| `template.source` in `project.config.json` | Het adres waar de melding heen gaat, hetzelfde als voor `template:update` | |

## Wat erin komt

De opdracht leest vier vaste plekken en neemt alleen wat sinds de vorige melding is bijgekomen:

| Wat | Waar het staat | Zo heet het in de melding |
|---|---|---|
| Een besluit van het project | `docs/SPEC.md`, de rijen die niet uit het template komen | `P-D41`, zodat het niet botst met de nummers van het template |
| Een les | `docs/lessen-project.md`, elke `## P-01 Titel` | `P-01` |
| Een overgenomen bestand | `pnpm template:adopt <pad> --reason "waarom"`, de reden staat in `docs/terugmeldingen.md` | het pad |
| Een los punt | `RELEASE-NOTES.md`, de rubriek `### Voor het template` onder een versie | de versie, zoals `v2.39` |

Wat erin hoort: iets dat tijd kostte, waarvan je de oorzaak kent en dat opnieuw kan gebeuren. Een
wens voor het template mag ook. Wat er niet in hoort: code uit het project, namen van klanten,
collega's of systemen, en gegevens van wie dan ook. Schrijf de les in je eigen woorden, met hooguit
een klein neutraal voorbeeld.

## Stappen

1. Draai `pnpm template:report-back`. De opdracht noemt wat hij vond en schrijft het in
   `.terugmelding.md` in de wortel. Dat bestand gaat niet mee in git.
   **Controle:** onder "Verzameld sinds de vorige melding" staan de punten die je verwacht, en
   daarna "Neutraal" of een lijst met regels om aan te passen.
2. Lees `.terugmelding.md` na. Pas aan wat te specifiek is. Haal een punt helemaal weg (de kop en
   de tekst eronder) als het niet mee mag: het komt dan als "niet" in de administratie en niet bij
   de volgende keer terug.
3. Vink het akkoord bovenaan aan: `- [x] Akkoord: ...`. Daarmee zeg je dat het kennis in je eigen
   woorden is, zonder code, namen of gegevens, dat het template het mag gebruiken, en dat je weet
   dat andere deelnemers de melding kunnen lezen.
4. Verstuur: `pnpm template:report-back --send`. De opdracht controleert alles opnieuw, kijkt of de
   repo van het template privé is, en zet de melding als issue met een titel die begint met
   `[Terugmelding]`.
   **Controle:** "Verstuurd als #12" met het adres, en `.terugmelding.md` is weg.
5. Commit `docs/terugmeldingen.md` met je volgende wijziging: daarin staat welke punten erin zaten.

**Zonder `gh`.** Stap 4 zegt dan welke pagina je opent. Plak alles van `.terugmelding.md` onder de
titelregel in het tekstvak, verstuur, en leg het nummer vast met
`pnpm template:report-back --sent 12`.

## De sloten

Er gaat niets weg voordat dit klopt, en de opdracht noemt per regel wat hij vond:

- **Geen namen.** De naam van het project, de korte naam, de slug, de organisatie, het maildomein en
  het adres van productie uit `project.config.json`, en elk woord onder "Nooit in een terugmelding"
  in `docs/terugmeldingen.md`. Zet daar de namen van klanten en systemen die niet in de config staan.
- **Geen adressen of sleutels.** Geen e-mailadres (behalve `example.org` en `.invalid`), geen GUID
  (een tenant, een app), geen verbindingsstring, geen IP-adres, geen adres bij Vercel met de naam
  van je project, geen endpoint van Neon, geen tenant of site van Microsoft.
- **Geen geheimen.** De geheimenscan van `pnpm check:secrets` en de huisregel voor geheimen lopen over
  het bestand. Kan een scan niet draaien, dan weigert de opdracht ook.
- **Een akkoord.** Zonder vinkje gaat er niets weg.
- **Een privérepo.** Is de repo van het template openbaar, dan weigert de opdracht.

## Wat er daarna gebeurt

Bij het begin van elke nieuwe versie van het template worden de open meldingen langsgelopen. Per
punt komt er een oordeel: het template had het al (met waar), het komt in deze versie, of het wordt
niet overgenomen (met de reden). De CHANGELOG van het template noemt het nummer van je melding bij
wat eruit voortkwam, en het issue gaat dicht met de versie. Met `pnpm template:update` krijgt je
project de verbetering; een bestand dat je overnam, kun je dan weer aan het template teruggeven.

## Waarom zo

Een les die alleen in één project staat, kost het volgende project dezelfde middag. Een vaste plek
per soort kennis maakt het verzamelen werk voor een opdracht in plaats van voor iemands geheugen, en
de administratie in `docs/terugmeldingen.md` zorgt dat niets twee keer gaat. De mens drukt altijd
zelf op de knop, omdat de repo van een project van de klant is.

## Beveiliging

- Een melding is leesbaar voor iedereen met toegang tot het template, ook voor deelnemers van
  andere organisaties. Lees hem daarom na alsof hij openbaar is.
- De opdracht toont nooit een gevonden geheim of adres, alleen de regel en de soort.
- Labels zet je niet zelf: met alleen leesrecht laat GitHub ze vallen. Wie de meldingen langsloopt,
  zet ze.

## Kosten

Geen.

## Zo zie je dat het goed staat

- `pnpm template:status` noemt geen openstaande punten meer.
- `docs/terugmeldingen.md` heeft onder "Verstuurd" een regel met het nummer van je melding.

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| "Dit is de repo van het template zelf" | Je staat in de templaterepo, of je project draait nog op de standaardconfig (`pnpm template:status`) |
| "Er ligt al een melding klaar" | `.terugmelding.md` bestaat nog. Verstuur hem, of haal het bestand weg om opnieuw te beginnen |
| "is openbaar" | De repo van het template is nog niet privé. Wacht tot de beheerder van het template dat heeft gedaan |
| "gh kon ... niet lezen" | `gh auth login` met het account dat bij het template kan, of je hebt nog geen leesrecht |
| Een naam wordt gevonden in een woord dat geen naam is | Maak de zin algemener; een korte naam uit de config vangt soms een gewoon woord |
| Een besluit uit het template staat erbij als besluit van het project | De tekst van die rij wijkt af van de seed in het template. Haal het punt weg; het komt dan niet terug |
| De opdracht wil een les die al eens is verstuurd | Het nummer is veranderd. Gebruik het oude nummer, of haal het punt weg |
