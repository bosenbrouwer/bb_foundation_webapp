<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Werkwijze: zo bouw je met Claude Code aan dit project

Voor de mens die dit project stuurt. Claude Code bouwt; jij beslist, controleert en doet het handwerk
buiten de code. Dit document zegt hoe dat samenspel loopt. De regels voor de code zelf staan in
`CLAUDE.md`; die leest Claude vanzelf.

## 1. Wie doet wat

| Jij | Claude Code |
|---|---|
| Schrijft en onderhoudt `docs/PROJECTPLAN.md`: wat het moet doen en voor wie | Leidt daar `docs/SPEC.md`, het datamodel en de schermen uit af |
| Geeft opdrachten per ronde en keurt de uitkomst | Bouwt, test, en levert op met wat er met de hand moet |
| Neemt besluiten en laat ze vastleggen | Legt ze vast in het besluitenlog, met de prijs erbij |
| Doet git: committen, pull requests, mergen, tags | Raakt git niet aan |
| Beheert accounts, geheimen en kosten (handleidingen) | Noemt welke variabelen er nodig zijn, nooit de waarden |
| Draait de e2e en de checks tegen de dev-branch als dat gevraagd wordt | Draait alles wat zonder database kan, en zegt wat niet kon |

## 2. Eén ronde, van begin tot eind

1. **Je zegt wat je wilt**, in gewone taal, met het waarom erbij (zie 3).
2. **Claude verduidelijkt** als twee lezingen tot ander werk leiden, en bouwt anders meteen.
3. **Claude bouwt en test**: typecheck, lint, unittests, build, de checks. Wat een database nodig
   heeft, vraagt hij jou of zet hij in de lijst van wat nog moet.
4. **Claude levert op** met: wat er is veranderd, de versie (`vX.YY` in `lib/version.ts` en de twee
   release-notesbestanden), welke bewijzen groen zijn, en wat jij nog met de hand doet.
5. **Jij commit op `release/next`** en opent een pull request naar `main`. Vercel bouwt een preview
   met een eigen database uit de branch `seed`: het schema en de seed, geen echte gegevens.
   Handleiding 09 gaat klik voor klik.
6. **Jij controleert op de preview** (zie 4) en mergt pas als het klopt.
7. **Vercel zet live.** Kijk daarna één keer in de tool of de versie linksonder in de rail de nieuwe
   is, en ruim `release/next` op voor de volgende ronde.

## 3. Zo geef je een goede opdracht

Zeg wat je wilt bereiken en voor wie, niet hoe het gebouwd moet worden. Noem wat er mis is als het
een reparatie is. Noem de grens: wat hoort er niet bij.

- Slecht: "Maak een tabel met een filter." Goed: "De coördinator wil per week zien welke diensten
  nog niemand hebben, zodat ze mensen kan bellen. Alleen de open diensten, oudste eerst."
- Slecht: "Fix de login." Goed: "Anna krijgt na het inloggen een leeg scherm; in de console staat
  een fout over een ontbrekende rol. Ze heeft gisteren de rol coördinator gekregen."
- Slecht: "Bouw de hele planningsmodule." Goed: "Deze ronde alleen het aanmaken van een dienst met
  datum, tijd en aantal mensen. Toewijzen en herinneren komen later."

Plak nooit een wachtwoord, een verbindingsstring of een token in de chat. Een variabele hoort in
Vercel en in `.env.local`; Claude heeft alleen de naam nodig.

## 4. Wat je controleert voordat je mergt

- De oplevering noemt een versie, en `RELEASE-NOTES-KORT.md` zegt in gewone taal wat er verandert.
- De rubriek Bewijs zegt welke checks groen zijn en wat niet gedraaid kon worden.
- Open de pull request op GitHub: de CI is groen. De CI is advies en geen slot (het gratis plan heeft
  geen branch protection), dus kijk ernaar.
- Als er een migratie in zit: de release notes zeggen "Let op bij bijwerken", en jij weet dat de
  deploy de migratie draait. De preview heeft geen echte data: kan de migratie bestaande rijen
  weigeren, dan is er eerst op productie geteld (handleiding 09, "Wat de preview niet bewijst").
- Klik het scherm na in de preview van Vercel, in beide modi als het een nieuw scherm is.

## 5. Besluiten

Een besluit is iets wat later een vraag voorkomt: een regel, een grens, een keuze tussen twee
redelijke dingen. Het staat in `docs/SPEC.md` onder het besluitenlog, met een nummer dat nooit
verandert, een datum, het besluit, en het waarom met de prijs.

Een besluit omkeren mag, maar niet stil. Vraag Claude om tegengas met de prijs van het omkeren;
kies dan; laat het volledig uitvoeren; laat het vastleggen met een verwijzing naar wat het vervangt.

## 6. Als Claude tegengas geeft

Dat is de bedoeling. Claude zegt wat een keuze kost en wat er stuk kan gaan. Lees het, en beslis.
Herhaal je de opdracht, dan voert Claude hem uit zoals gevraagd en zegt dat erbij. Je hoeft het niet
eens te zijn, maar je hoort het wel te hebben gehoord.

## 7. Versies en Over de tool

Elke pull request is een versie: `v0.02`, `v0.03`. De tweede positie loopt op per ronde; de eerste
alleen op jouw woord. De versie staat linksonder in de rail en op het inlogscherm, en Over de tool
toont de release notes in gewone taal. Zo is "werkt het al?" altijd te beantwoorden: staat de versie
er, dan zit de reparatie erin.

## 8. Het ritme

- **Per ronde**: opdracht, oplevering, pull request op `release/next`, controle op de preview, merge.
  Staan er pull requests van Dependabot open, neem ze dan mee in de ronde en sluit ze daarna; nooit
  los mergen, want ze gaan om de versie en de release notes heen.
- **Na een paar rondes**: leerde je iets dat tijd kostte en opnieuw kan gebeuren, laat Claude het dan
  als les in `docs/lessen-project.md` zetten, en meld het terug aan het template met
  `pnpm template:report-back` (handleiding 12). Jij leest de melding na en drukt op de knop.
- **Wekelijks**: kijk één keer op Beheer, Systeem. Alles groen is alles goed.
- **Maandelijks**: de kosten van GitHub, Vercel en Neon tegen het plafond uit je checklist, en de
  vervaldata (client secrets, tokens) in dezelfde checklist.
- **Jaarlijks**: `public/.well-known/security.txt` nalopen, en de accounts: wie heeft er nog toegang
  die het niet meer nodig heeft.

## 9. Als iets misgaat

1. Kijk op Beheer, Systeem: versie, databaseschema, koppelingen. Rood zegt waar.
2. Kijk in de logs van Vercel bij de laatste deploy.
3. Geef Claude de foutmelding letterlijk, met wat je deed en wanneer. Niet "het doet het niet".
4. Een deploy terugdraaien kan in Vercel met één klik (Instant Rollback), en daarna weer vooruit
   met Undo Rollback; tot dan gaat een merge niet live. Een migratie terugdraaien doet
   `pnpm db:down` op de dev-branch, en op productie alleen na overleg.

Handleiding 90 heeft de lijst van bekende storingen en wat eraan te doen is.

## 10. Git in het kort

- Elke ronde loopt op de vaste branch `release/next`: aanmaken vanaf `main`, pull request naar
  `main`, testen op de preview, mergen, branch weg. De volgende ronde weer dezelfde naam, zodat de
  preview steeds hetzelfde adres heeft. Zie handleiding 09.
- Direct op `main` is de uitzondering: alleen als je alleen werkt en er nog geen echte gebruikers
  zijn. Daarna nooit meer.
- Commit met een boodschap die zegt wat en waarom, in de vorm `type: omschrijving`
  (`feat:`, `fix:`, `docs:`, `chore:`). De commit-hook weigert een em-dash.
- Pull request naar `main`, naam gelijk aan de versie (`v0.07: diensten aanmaken`), mergen als de
  CI groen is en jij het scherm hebt gezien.
- Een tag alleen voor het template zelf; een project heeft genoeg aan versies in de release notes.

## 11. Bouwen met agents

Bij een grote ronde verdeelt Claude het werk over agents: de hoofdsessie schrijft per onderdeel een
opdracht, een agent bouwt, en de hoofdsessie leest wat er veranderd is, draait zelf alle controles
en legt de besluiten vast. Dat werkt alleen met een precieze opdracht. Dit mag je verwachten, en
hier kun je om vragen:

- **Een precieze opdracht per agent.** Wat besloten is, welke bestanden als voorbeeld dienen, wat
  "klaar" is en wat niet mag. Twee zinnen horen in elke opdracht: "zet in je verslag wat je niet kon
  bewijzen" en "vind je een fout in de kern, repareer hem niet stil".
- **Laat de bron lezen in plaats van hem te vertrouwen.** Hoe een bibliotheek iets doet, staat in de
  geïnstalleerde code. Vraag om het bestand en de regel in het verslag, niet om wat Claude zich
  herinnert.
- **Zeg wat zonder database bewezen is, en wat niet.** Wat puur is, is getoetst. Wat een database
  nodig heeft, staat als lijst in de oplevering, met waar het bij de eerste echte run het eerst mis
  kan gaan.
- **Splits ophalen en tonen.** Een pagina haalt de gegevens op en geeft gewone waarden door aan een
  component dat alleen toont. Dan is elk scherm met verzonnen gegevens te bekijken voordat er een
  database is.
- **Een feitenblad vóór een overdracht.** Gaat werk van de ene sessie of de ene repo naar de andere,
  dan eerst een blad met per onderwerp wat de een heeft, wat de ander heeft en het verschil, met
  bestand en regel. Zo'n blad vindt de gaten die een verhaal overslaat.
- **Documentatie die de code tegenspreekt, is een bevinding.** Niet iets om stil recht te zetten:
  een van de twee is fout, en soms is dat de code. Laat het melden.
