<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 04. Neon

**Wat het is.** Neon is de Postgres-database: één productiebranch, een dev-branch om op te werken,
een branch `seed` zonder echte gegevens, en een wegwerpbranch per pull request die uit `seed` komt.
**Tijd:** een half uur.

**Doe dit na** 03. **Daarna kun je** de variabelen zetten (06) en lokaal werken (07).

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| Het Vercel-team uit 03 | De Marketplace koppelt de database aan het project | |
| Een Neon-account op het adres van de organisatie | Ontstaat via de Marketplace, of los op neon.tech | |

## Wat je aanmaakt

| Wat | Naam | Waar de waarde heen gaat |
|---|---|---|
| Een database (project) in Frankfurt | de slug van je project | `DATABASE_URL` en `DATABASE_URL_UNPOOLED` in Vercel, per omgeving (06) |
| Een branch `dev` | `dev` | de Development-waarden in Vercel, dus `.env.local` |
| Een branch `seed`, de default branch van het Neon-project | `seed` | nergens: elke preview-branch komt eruit. Vullen doe je in 07, stap 4c |
| Het endpoint-id van productie | ziet eruit als `ep-woord-woord-a1b2c3d4` | `PRODUCTION_DB_ENDPOINT` in Vercel en in `.env.local`; `SEED_TARGET` lokaal krijgt het id van `dev` |
| De inlogrol van de app op productie (na de eerste deploy) | `<slug>_app` | `DATABASE_URL_APP` in Vercel, alleen Production (zie onderaan) |

## Stappen

1. In het Vercel-team: **Storage, Create Database, Neon**. Regio **Frankfurt (eu-central-1)**, het
   gratis plan, naam de slug van je project. Koppel aan het project voor **alle drie** de omgevingen.
   De regels van Production en Preview beheert de integratie vanaf nu, en die laat je met rust. De
   regel van Development blijft niet zo staan: in 06, stap 3 zet je die met de hand op de strings van
   `dev`.
   **Controle:** onder Settings, Environment Variables staan nu `DATABASE_URL` en de ongepoolde
   variant, beheerd door de integratie.
2. Open de Neon-console (knop in Vercel). **Branches, Create branch**: naam `dev`, parent de
   productiebranch. Maak op dezelfde manier een branch `seed`, ook met de productiebranch als parent:
   die is nu nog leeg, dus `seed` ook. Zet `seed` daarna op **Set as default** (in het menu met de
   drie puntjes achter de branch). Neon maakt elke preview-branch uit de default branch, dus zo komt
   er nooit een kopie van productie in een preview. De productiebranch blijft de production branch en
   gaat in stap 4 op slot. Staan er al echte gegevens in de productiebranch, maak `seed` dan niet zo:
   een branch met de productiebranch als parent neemt alles mee. Volg dan "Een seed-branch achteraf"
   hieronder.
   **Controle:** `dev` staat in de lijst met een eigen compute, en `seed` staat erin als default
   branch. In Vercel wijst de Production-regel van `DATABASE_URL` nog naar het endpoint van de
   productiebranch (het id dat je in stap 5 noteert als `PRODUCTION_DB_ENDPOINT`). Kun je dat daar
   niet zien, dan zegt de eerstvolgende productiedeploy het: het buildlog toont "Migreren vanuit
   omgeving production naar endpoint ep-...", en `pnpm db:deploy` weigert als dat een ander endpoint
   is dan `PRODUCTION_DB_ENDPOINT`.
3. In de instellingen van de Vercel-integratie in Neon: **per preview-deployment een branch**
   aanmaken aan, **auto-delete** zodra de pull request sluit, en **Automatically delete obsolete
   branches** aan: verdwijnt de Git-branch, dan verdwijnt de databasebranch ook.
   **Controle:** de eerstvolgende pull request krijgt een branch `preview/<branch>` in Neon, met
   `seed` als parent. Met de werkwijze uit 09 is dat `preview/release/next`: elke ronde een verse
   kopie van `seed`, met het schema en de seed en zonder echte gegevens.
4. Zet op het project **autosuspend** op de kortste tijd die het plan toestaat, het **minimum
   compute** op de laagste stand, en **history retention** op het maximum van je plan (op het gratis
   plan zes uur).
   Zet de **Data API** niet aan, op geen enkele branch: die zet Row Level Security op elke tabel
   zonder één regel, en de rol van de app ziet dan nul rijen (de eigenaar merkt er niets van). Staat
   hij al aan en gebruik je hem niet: uitzetten, en de rollen `authenticator`, `anonymous` en
   `authenticated` en de schema's `auth` en `pgrst` opruimen. Zet bij **Branches** de productiebranch
   op **Set as protected**, tegen per ongeluk verwijderen of resetten. Geen IP Allow List: Vercel
   heeft geen vast adres, dus die sluit de app zelf buiten.
   **Controle:** de compute van `dev` slaapt een paar minuten na je laatste query, en de Data API
   staat op uit.
5. Kopieer van `dev` (**Connect**) de **pooled** verbindingsstring (hostnaam met `-pooler`) en de
   **direct** string (zonder). Die gaan in 06 naar de Development-omgeving van Vercel. Noteer van de
   productiebranch het **endpoint-id** (geen wachtwoord, geen string): dat wordt
   `PRODUCTION_DB_ENDPOINT` in Vercel voor alle drie de omgevingen.
   **Controle:** beide strings eindigen op `?sslmode=require`; het endpoint-id begint met `ep-`.
6. Voer op `dev` in de SQL Editor uit: `select version();`. De eerste migraties (de baseline van het
   template, met de rol van de app en het slot op elke tabel) draaien bij de eerste deploy en lokaal
   met `pnpm db:migrate`.
   **Controle:** `pnpm db:status` (na 07) begint met "Verbonden met endpoint" en het endpoint-id van
   `dev`, zegt bij Migraties dat er evenveel zijn toegepast als de code kent, en sluit na de seed af
   met "Dit is je wegwerpbranch." Het script noemt een branch nooit bij naam: het endpoint-id is de
   enige manier om te zien waar je zit.

## De rol van de app op productie

Na de eerste deploy (08). De migraties maken de rol `app_rw` aan: lezen en schrijven in `public`,
de migratiestand lezen, de audit log alleen aanvullen, geen DDL, en op elke tabel de regel die de
rol alle rijen geeft. De app verbindt ermee via een eigen variabele, omdat `DATABASE_URL` door de
Neon-integratie wordt beheerd. Zonder die variabele werkt de app als eigenaar, zoals voorheen; dat
is geen storing, maar wel een gat dat je dicht wilt. Lokaal doet `pnpm db:app-login` dit voor je (07).

1. Controleer in de SQL Editor op de productiebranch dat de migraties er staan:
   `select count(*) from pg_policies where policyname = 'app_rw_all';` geeft het aantal tabellen.
2. Maak de inlogrol, in de **SQL Editor** op de productiebranch, als eigenaar (niet via **Roles** in
   de console: een rol van daar wordt lid van `neon_superuser` en mag dan weer alles):
   ```sql
   CREATE ROLE <slug>_app WITH LOGIN PASSWORD '<een lang willekeurig wachtwoord>' IN ROLE app_rw;
   ```
   Het wachtwoord maak je met `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`
   en bewaar je nergens anders dan in de volgende stap.
   **Controle:** `select rolname from pg_roles where rolname like '%_app';` toont de rol.
3. Vercel, Settings, Environment Variables, **alleen Production**, Sensitive: `DATABASE_URL_APP` =
   de **pooled** verbindingsstring van productie (host met `-pooler`) met `<slug>_app` en dat
   wachtwoord in plaats van `neondb_owner`. Laat `DATABASE_URL` en `DATABASE_URL_UNPOOLED` staan: die
   blijven van de eigenaar, voor de migraties bij de deploy.
4. **Deployments, Redeploy** van productie.
   **Controle:** inloggen werkt, Beheer, Systeem is groen, en in de SQL Editor geeft
   `select usename, count(*) from pg_stat_activity where usename is not null group by usename;`
   een regel met `<slug>_app`. "Het werkt" alleen bewijst niets: een terugval op de eigenaar werkt
   ook. Faalt er iets met "permission denied" of met "er is nog geen organisatie": haal
   `DATABASE_URL_APP` weg en redeploy, dan valt de app terug op de eigenaar. Meld de melding, dan komt
   het recht of de regel in een migratie.

Previews houden de eigenaar: hun verbinding maakt de integratie per branch, en daar past geen vaste
waarde in. `pnpm check:grants` bewaakt de rechten en het slot op elke branch.

## Een seed-branch achteraf

Voor een project dat al echte gegevens heeft en waarvan de previews nog uit de productiebranch
komen. Een nieuwe branch met de productiebranch als parent zou die gegevens meenemen, dus hier gaat
het anders dan in stap 2. **Deze route is in het template nog niet tegen een echte database
bewezen. Doe hem met Claude, stap voor stap, en lees elke uitkomst voor je verdergaat.**

1. Neon-console, **Branches, Create branch**: naam `seed`, de productiebranch als bron, en de optie
   die alleen het schema overneemt (schema only). Zet `seed` daarna op **Set as default**.
   **Controle:** `seed` heeft de tabellen en geen rijen: in de SQL Editor op `seed` geeft
   `select count(*) from users;` nul.
2. Zet `.env.local` tijdelijk op `seed`, zoals in 07, stap 4c, en draai `pnpm db:status`.
   **Let op:** een branch met alleen het schema heeft de tabellen wel, maar de lijst van gedraaide
   migraties (`drizzle.__drizzle_migrations`) is leeg. `pnpm db:status` toont dan "0 toegepast".
   Draai dan **niet** `pnpm db:migrate`: die begint opnieuw bij de eerste migratie en strandt op
   "already exists".
3. Neem eerst de rijen van `drizzle.__drizzle_migrations` over van de productiebranch. Daar staan
   alleen hashes en tijdstippen in, geen gegevens: de kolommen `hash` en `created_at`. In de SQL
   Editor op de productiebranch: `select hash, created_at from drizzle.__drizzle_migrations order by id;`
   en op `seed` dezelfde rijen in dezelfde volgorde met
   `insert into drizzle.__drizzle_migrations (hash, created_at) values (...)`.
   **Controle:** `pnpm db:status` zegt bij Migraties dat er evenveel zijn toegepast als de code kent.
4. Draai daarna `pnpm db:bootstrap` en `pnpm db:seed`, zet `.env.local` terug op `dev` en draai
   `pnpm db:app-login` (07, stap 4c).
   **Controle:** de eerstvolgende pull request krijgt een preview-branch met `seed` als parent, en op
   die preview staan geen gegevens van productie. Voor inloggen op die preview: zie 09.

## Waarom zo

Lokaal werk je nooit tegen productiedata: daarom `dev`. Een pull request krijgt een eigen kopie van
het schema zodat een migratie heen en terug getest is voordat hij `main` haalt: daarom de branch per
preview. Die kopie komt uit `seed` en niet uit productie. In de documentatie van Neon, gelezen op 17
november 2026, staat dat een preview-branch altijd uit de default branch komt, dat de production
branch daar los van staat, en dat een preview-branch verdwijnt als de deployment bij Vercel
verdwijnt. Een kopie van productie bleef in een eerder project zo tien tot twaalf dagen staan, met
echte gegevens erin. De prijs van `seed` staat in 09: een migratie ziet op de preview geen echte
data. En omdat een console-instelling een keer misgaat, controleert `pnpm db:deploy` zelf of een
preview niet op het productie-endpoint uitkomt; daarvoor moet hij weten welk id dat is.

Geen lokale Postgres: Neon heeft `btree_gist` en de extensies die de patronen van het template
gebruiken, en een lokale installatie zonder die extensies laat constraints stil weg.

## Beveiliging

- De verbindingsstrings zijn geheimen: alleen in Vercel (Sensitive) en in `.env.local`.
- Een preview komt uit `seed` en bevat geen echte gegevens. Maak je `dev` later opnieuw, neem dan
  `seed` als parent en niet de productiebranch, zodat er ook lokaal geen echte gegevens komen.
- `seed` loopt niet vanzelf mee met een gewijzigde seed: vul hem dan opnieuw (07, stap 4c). De
  migraties hoeven niet vooraf: de bouw van elke preview draait ze op zijn eigen branch.
- `pnpm db:seed` schrijft alleen op de branch uit `SEED_TARGET` en weigert op Vercel en op het
  productie-endpoint.
- Point-in-time restore: weet hoe lang je terug kunt (history retention) en waar de knop zit. Op het
  plan Free is dat hoogstens **zes uur** (stand oktober 2026): een fout die later wordt ontdekt, is
  niet terug te zetten. Een wekelijkse `pg_dump` naar een plek buiten Neon werkt ook op Free en kost
  bij Neon niets extra; dat is het goedkoopste gat om te dichten, zie 30.
- De app verbindt op productie als de rol van de app, niet als eigenaar, en elke tabel heeft het slot
  met één regel. Elke andere rol ziet niets, ook een Data API die iemand later aanzet.
- Het wachtwoord van de eigenaar draai je zonder de knoppen van de integratie: zie 30.

## Kosten

Plan: **Free** tot het niet meer past (compute-uren en opslag staan in de console). Plafond: het
plan zelf; op Launch een harde limiet via de instellingen van het project. Uit je checklist: het deel
voor Neon. Wat de rekening maakt: compute die wakker blijft (crons die vaak langskomen, een dev-branch
die de hele dag draait) en veel schrijfvolume. Upgraden is nodig als de gratis compute-uren op zijn
of als je meer branches wilt. Stand van oktober 2026.

## Zo zie je dat het goed staat

- `pnpm db:status` lokaal: het endpoint-id is dat van `dev`, de migraties staan, en na de seed zegt
  het script "Dit is je wegwerpbranch."
- `seed` is de default branch, en een pull request toont in Neon een branch `preview/...` met `seed`
  als parent.
- Beheer, Systeem in de tool: "Databaseschema" is groen.

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| `pnpm db:migrate` faalt op SSL of een time-out | De direct string ontbreekt of is de pooled string; migraties gaan over `DATABASE_URL_UNPOOLED` |
| Een preview-deploy faalt met een melding over `PRODUCTION_DB_ENDPOINT` | Met opzet: zet het id in Vercel voor alle drie de omgevingen, zie 06 |
| Een productiedeploy faalt met "wijst naar ..., maar productie is ..." | Met opzet: `DATABASE_URL_OWNER` (of de string van de integratie) wijst naar een andere branch dan `PRODUCTION_DB_ENDPOINT`; kijk welke van de twee fout is, zie 30 |
| "relation does not exist" na een deploy | De migratie is niet gedraaid: kijk in de build-log naar `pnpm db:deploy` |
| Na het zetten van `DATABASE_URL_APP`: "permission denied" of "er is nog geen organisatie" | Een recht of de regel van het slot ontbreekt op een tabel, of de migraties staan nog niet op productie; haal de variabele weg, redeploy, en draai `pnpm check:grants` op dev |
| Inloggen valt om nadat iemand de Data API aanzette | Het slot staat op tabellen zonder regel; `pnpm check:grants` wijst ze aan. Zet de Data API uit en zet de regel terug met `pnpm db:migrate` op een verse branch, of met de SQL uit `lib/db/migrations/` |
| De rekening loopt op | Compute slaapt niet: autosuspend korter, crons minder vaak, branches opruimen |
| Een preview toont gegevens van productie | De preview-branch kwam niet uit `seed`: `seed` is niet de default branch, of de branch bestond al voordat je dat instelde. Zet `seed` op Set as default en open een nieuwe pull request |
| `pnpm db:migrate` op `seed` strandt op "already exists" | `seed` is een branch met alleen het schema, en de lijst van gedraaide migraties is leeg; zie "Een seed-branch achteraf" |

## Vul in

Noteer dit in `docs/inrichting.md`, niet in dit bestand (zie `00-checklist.md`).

| Wat | Waarde |
|---|---|
| Neon-project | |
| Productiebranch en endpoint-id | |
| Dev-branch en endpoint-id | |
| Seed-branch en endpoint-id, en de datum waarop hij voor het laatst is gevuld | |
| Plan, autosuspend, retention, herstelvenster | |
| Inlogrol van de app op productie, en de datum van `DATABASE_URL_APP` | |
| Datum aangemaakt | |
