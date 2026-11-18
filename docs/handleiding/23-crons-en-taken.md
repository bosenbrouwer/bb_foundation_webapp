<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 23. Crons en taken

**Wat het is.** Werk dat vanzelf gebeurt: opruimen, de wachtrij verwerken, mail versturen, een
melding als iets stilstaat. Elke cron is een route die Vercel op een vast moment aanroept met een
geheim, en dezelfde code als een `pnpm task:<naam>` die je zelf kunt draaien. **Tijd:** een kwartier
om te begrijpen; inrichten is één variabele.

**Doe dit na** 06. **Daarna kun je** op Beheer, Systeem en Beheer, Achtergrondwerk zien dat het loopt.

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| `CRON_SECRET` in Vercel, alleen Production (06) | Zonder weigert elke cronroute | |
| De crons in `vercel.json` (komen uit het manifest van het template) | Vercel leest ze bij de deploy | |

## Wat er loopt

| Cron | Module | Rooster (UTC) | Wat |
|---|---|---|---|
| `/api/cron/prune` | kern | dagelijks 03:30 | oude rijen weg (rate limits, en wat het project toevoegt) |
| `/api/cron/jobs` | jobs | dagelijks 03:45 | de wachtrij verwerken en afgehandeld werk opruimen |
| `/api/cron/outbox` | messaging | dagelijks 03:50 | mail versturen, de vastloopmelding, opruimen |

De roosters staan in UTC: 03:30 UTC is 05:30 in de zomer en 04:30 in de winter.

## Stappen

1. Controleer na een deploy in Vercel onder **Settings, Cron Jobs** dat elke cron uit `vercel.json`
   er staat.
   **Controle:** de lijst klopt met de tabel hierboven plus wat het project toevoegde.
2. Kijk een dag later onder **Logs** of de crons liepen (status 200).
   **Controle:** per cron een regel met 200. Een 404 betekent dat `CRON_SECRET` niet klopt; een 500
   betekent dat een stap in de ronde mislukte, zie "Een rode cron" hieronder.
3. Wil je een ronde nu: `pnpm task:prune`, `pnpm task:jobs`, `pnpm task:outbox` vanaf je machine,
   tegen de database in `.env.local`. Of de knoppen op Beheer, Achtergrondwerk en Beheer, Berichten.
   **Controle:** het script drukt een telling af. Bij `pnpm task:prune` staat achter een mislukte
   stap "MISLUKT, zie de melding hierboven", en het script eindigt dan met een fout.
4. Op Vercel Pro mag een cron vaker: zet dan in `vercel.json` het rooster van `/api/cron/jobs` en
   `/api/cron/outbox` op het kwartier in werkuren, `*/15 5-18 * * 1-5`, en zet die paden in
   `template.keepCrons` in `project.config.json`, zodat een update van het template het rooster niet
   terugzet. Het rooster staat in UTC: elk kwartier van 05:00 tot en met 18:45, maandag tot en met
   vrijdag, dus van 07:00 tot 20:45 in de zomer en van 06:00 tot 19:45 in de winter. Niet
   `*/15 * * * *`: een cron die dag en nacht elk kwartier langskomt, houdt de database wakker, en
   Neon rekent compute-uren. Kwartiercrons alleen op werkuren, daarbuiten hoogstens per uur.
   **Controle:** `pnpm template:apply` meldt dat het pad het rooster van het project houdt.

## Een rode cron

Een cronroute met meer dan één ronde draait die rondes als stappen, elk met een eigen opvang.
Mislukt er een, dan lopen de andere gewoon door. De route antwoordt dan met status 500, en in het
antwoord staat onder `failed` welke stappen mislukten. Bij Vercel staat de cron daardoor als
mislukt.

Rood betekent dus niet dat de hele nacht stilstond. Het betekent: er is één stap om naar te kijken.

| Cron | Stappen |
|---|---|
| `/api/cron/prune` | `rate_limits`, en de stappen die het project toevoegt |
| `/api/cron/jobs` | `process` (de wachtrij verwerken), `prune` (opruimen) |
| `/api/cron/outbox` | `send` (versturen), `stuck` (de vastloopmelding), `prune` (opruimen) |

De naam van de mislukte stap vind je in **Vercel, Logs**, in een regel die begint met
`[report] cron GET /api/cron/<naam> (<stap>)`. Daarachter staat de fout, en bij een databasefout
tussen rechte haken de oorzaak als labels, zoals `cause_code` en `cause_constraint`. Geef Claude die
regel letterlijk. Wat Postgres over de inhoud van de rij zegt, gaat niet mee: alleen de labels.

## Waarom zo

Op Vercel Hobby mag een cron hoogstens één keer per dag. Daarom gebeurt het echte werk direct na de
handeling die het veroorzaakte (de ronde na het antwoord, `kickJobs` en `kickOutbox`) en is de cron
het vangnet voor wat daar misging. Op Pro mag het vaker en wordt het vangnet in werkuren een
kwartier. Buiten die uren loopt de ronde nog steeds direct na elke handeling; alleen het vangnet
rust dan.

Elke ronde in een cron is een eigen stap, omdat de rondes een nacht delen en geen lot. In een eerder
project gooide de tweede ronde van een nachtelijke route op bijna elke dag, en daardoor liepen de
zes rondes erna die nachten ook niet. Niemand miste een melding die niet kwam.

Een cron die over zijn tijd gaat wordt stil afgekapt; elke route zet daarom `maxDuration` op 60 en
werkt in rondes van beperkte grootte.

## Beveiliging

- Zonder het juiste token geeft elke cronroute een 404, alsof hij niet bestaat; `pnpm smoke:prod`
  controleert dat.
- `CRON_SECRET` staat alleen in Production; previews draaien geen crons.
- Een taak vanaf je machine werkt op de database in `.env.local`: de dev-branch, tenzij je bewust
  iets anders inlaadt.

## Kosten

Cronaanroepen tellen als functieaanroepen en vallen binnen de bundel. Wat telt: een cron die vaak
langskomt houdt de database wakker (04). Daarom een kwartierrooster alleen in werkuren (stap 4).
Stand van oktober 2026.

## Zo zie je dat het goed staat

- Vercel, Logs: elke cron 200 op zijn tijd.
- Beheer, Achtergrondwerk en Beheer, Berichten: niets "vastgelopen".

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| 404 in de logs van een cron | `CRON_SECRET` ontbreekt of wijkt af in Production |
| 500 met "CRON_SECRET ontbreekt. Zonder die variabele weigert deze route, want anders kan iedereen hem aanroepen." | De variabele ontbreekt helemaal in Production; zet hem (06, stap 2) en deploy opnieuw |
| 500 met een lijst onder `failed`, en de cron staat rood bij Vercel | Een stap in de ronde gooide; de andere stappen zijn wel gelopen. Zie "Een rode cron" |
| De cron liep, maar de rij groeit | De ronde haalt het werk niet binnen de tijd; op Pro vaker draaien, of kijk naar wat er mislukt op Beheer |
| "vastgelopen" op Beheer | Er wacht al een uur werk zonder dat er iets gebeurt; meestal een variabele of een token |
| Deploy weigert op Hobby | Een rooster vaker dan dagelijks; zet het terug of ga naar Pro |

## Vul in

Noteer dit in `docs/inrichting.md`, niet in dit bestand (zie `00-checklist.md`).

| Wat | Waarde |
|---|---|
| Plan en dus het rooster van de wachtrij | |
| Wie kijkt in de logs als iets stilstaat | |
