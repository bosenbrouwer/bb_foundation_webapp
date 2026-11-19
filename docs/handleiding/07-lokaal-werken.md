<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 07. Lokaal werken

**Wat het is.** De tool op je eigen machine, tegen de dev-branch van Neon, met een dev-login zodat je
snel van rol kunt wisselen zonder Microsoft. Dit is waar Claude Code bouwt en test. **Tijd:** een
half uur de eerste keer.

**Doe dit na** 06. **Daarna kun je** bouwen, de checks en de e2e draaien, en de eerste deploy doen (08).

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| Node 24 en pnpm (de versie uit `package.json`, `packageManager`) | De toolchain | |
| Git en de Vercel CLI (`npm i -g vercel`) | Code ophalen en variabelen ophalen | |
| Claude Code | Bouwt met je mee | |
| Een gekoppelde map (`vercel link`, uit 03) | `vercel env pull` weet dan welk project | |

## Stappen

1. Kloon de repo en open de map. Draai `pnpm install`.
   **Controle:** geen fouten; `node_modules` bestaat.
2. `vercel env pull .env.local`. Voeg met de hand drie regels toe: `APP_ENV=local`, `AUTH_DEV_LOGIN=1`
   en `SEED_TARGET=<endpoint-id van de dev-branch>`. Staat `PRODUCTION_DB_ENDPOINT` er niet in (06
   zet hem ook voor Development), zet hem er dan bij. Elke `vercel env pull` overschrijft het bestand:
   zet ze er daarna weer in, en draai stap 4b opnieuw.
   **Controle:** `git status` toont `.env.local` **niet**; hij staat in `.gitignore`.
3. `pnpm template:apply` als je dat nog niet deed na de startprompt, en volg de slottekst.
   **Controle:** "template.lock.json geschreven" en een lijst met wat je nu doet. Daarna
   `pnpm doctor`: Node, git, het template, `.env.local` en de database tegen `SEED_TARGET`, zonder
   iets aan te raken. Geen regel op ACTIE.
4. `pnpm db:status`. De eerste regel is "Verbonden met endpoint" met een endpoint-id: dat moet het
   id van `dev` zijn, en achter `SEED_TARGET` staat "(komt overeen)". Het script noemt geen branch
   bij naam; het endpoint-id is hoe je ziet waar je zit. Zolang de database leeg is, eindigt het met
   "SEED_TARGET wijst hierheen. Er staan nog geen gebruikers in, dus draai pnpm db:seed."
   Daarna `pnpm db:migrate` (de baseline en wat de modules genereerden), `pnpm db:bootstrap` (de
   organisatie) en `pnpm db:seed` (de dev-accounts).
   **Controle:** `pnpm db:status` zegt bij Migraties dat er evenveel zijn toegepast als de code kent,
   en eindigt nu met "Dit is je wegwerpbranch." De seed zegt wat hij aanmaakte en is idempotent (een
   tweede keer verandert niets).
4b. `pnpm db:app-login`. Dat maakt op `dev` de inlogrol `<slug>_app` (lid van `app_rw`, de rol van
   de app) met een nieuw wachtwoord en zet `DATABASE_URL_APP` in `.env.local`. Vanaf dan werken
   `pnpm dev` en de e2e als die rol, net als productie: een recht dat de rol mist, vind je zo hier
   en niet op productie. De scripts en de checks blijven als eigenaar werken. Het script weigert op
   het productie-endpoint en zonder `PRODUCTION_DB_ENDPOINT`.
   **Controle:** `pnpm doctor` zegt "De app werkt lokaal als de rol van de app", en
   `pnpm check:grants` is groen.
4c. Vul de branch `seed` op dezelfde manier: nu één keer, en opnieuw als de seed verandert. Elke
   preview komt uit `seed` (04, stap 2), dus wat daar staat, staat straks in elke preview: het
   schema, de organisatie en de dev-accounts, en geen echte gegevens.
   - Zet in `.env.local` tijdelijk drie regels om naar `seed`: `DATABASE_URL` en
     `DATABASE_URL_UNPOOLED` (de pooled en de direct string van `seed`, via **Connect** in de
     Neon-console, zoals in 04, stap 5) en `SEED_TARGET` (het endpoint-id van `seed`). Bewaar de
     regels van `dev`, bijvoorbeeld met een `#` ervoor.
   - `pnpm db:status`: het endpoint-id moet dat van `seed` zijn, met "(komt overeen)" achter
     `SEED_TARGET`.
   - `pnpm db:migrate`, `pnpm db:bootstrap` en `pnpm db:seed`.
   - Zet `.env.local` terug op `dev` en draai `pnpm db:app-login` opnieuw, zoals na elke wijziging
     van `.env.local`.

   Deze opdrachten werken als eigenaar, over `DATABASE_URL_UNPOOLED`. De app zelf (`pnpm dev`) en
   `pnpm invite` lezen eerst `DATABASE_URL_APP`, en die wijst nog naar `dev`. Wil je de app lokaal
   tegen `seed` draaien (09, inloggen op de preview met een wachtwoord), zet dan ook voor die regel
   tijdelijk een `#`.
   **Controle:** `pnpm db:status` toont weer het endpoint-id van `dev` en eindigt met "Dit is je
   wegwerpbranch."
5. `pnpm setup:hooks` voor de commit-hook die een em-dash weigert, en `pnpm dev`. Open
   http://localhost:3000. Onderaan het inlogscherm staat de dev-login: kies een dev-account en
   eventueel andere rollen.
   **Controle:** na inloggen zie je de rail met de versie linksonder en, als beheerder, Beheer.
6. De batterij. `pnpm check:all` draait alles achter elkaar, goedkoopste eerst, en sluit af met een
   tabel voor de rubriek Bewijs van de release notes. Los kan ook: `pnpm typecheck`, `pnpm lint`,
   `pnpm test`, `pnpm check:secrets`, `pnpm check:licenses` (geen GPL of AGPL in wat naar productie
   gaat), `pnpm check:migrations`, `pnpm check:drift`, `pnpm check:contrast`, `pnpm template:verify`
   en `pnpm build`; dan `pnpm db:roundtrip` (migraties heen en terug), de checks `pnpm check:core`,
   `pnpm check:grants` (en per module), en de e2e `pnpm e2e:all` (bouwt en test tegen `next start`
   op poort 3100).
   **Controle:** alles groen, en geen stap overgeslagen. Dit is wat Claude ook draait; wat een
   database nodig heeft draai jij als Claude dat vraagt.

## Waarom zo

Lokaal werken tegen een echte Neon-branch en niet tegen een lokale Postgres: de extensies en het
gedrag zijn dan gelijk aan productie, en een migratie die lokaal werkt, werkt ook daar. De dev-login
bestaat alleen als `AUTH_DEV_LOGIN=1` staat én `APP_ENV=local`, en weigert in elke andere omgeving te
laden, dus hij kan nooit in een deploy terechtkomen, ook niet buiten Vercel. `SEED_TARGET` zorgt dat `pnpm db:seed` alleen schrijft waar je het bedoelt.

## Beveiliging

- Op je laptop staat alleen de verbinding met je eigen dev-branch, nooit die van productie. Moet je
  één keer iets op productie nakijken, zet de verbinding dan op dat moment in een tijdelijk bestand en
  haal hem daarna meteen weg. De database is vanaf internet bereikbaar: wie de verbinding heeft, komt
  binnen (lessen L-NEON-15 en L-WERK-18).
- `.env.local` bevat geheimen. Nooit committen, nooit delen, nooit in de chat.
- De dev-accounts komen uit `auth.devUsers` in `project.config.json` (in de standaard
  `dev@voorbeeld.invalid`). `pnpm db:seed` zet ze alleen op de branch uit `SEED_TARGET`, dus op `dev`
  en op `seed`, en weigert op productie. Op een preview staan ze er als rij, maar de dev-login werkt
  alleen lokaal: er is daar niet mee in te loggen.
- Wie de machine deelt, deelt de sessie: log uit als je weggaat.

## Kosten

De dev-branch van Neon heeft een eigen compute die wakker is terwijl je werkt en daarna slaapt
(autosuspend, 04). Geen Vercel-kosten voor lokaal werken. Stand van oktober 2026.

## Zo zie je dat het goed staat

- `pnpm dev` start zonder rode regels en het inlogscherm toont de versie uit `lib/version.ts`.
- `pnpm db:status` zegt dat de database gelijk loopt met de code.
- Beheer, Systeem zegt bij Omgeving "lokaal".

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| Je weet niet waar het zit | `pnpm doctor` zegt per onderdeel wat niet klopt en wat je doet |
| `tsx ontbreekt` | `pnpm install` nog niet gedraaid in deze map |
| `DATABASE_URL_UNPOOLED ontbreekt` | `.env.local` is er niet of mist de Development-waarden; `vercel env pull .env.local` opnieuw |
| De dev-login staat er niet | `AUTH_DEV_LOGIN=1` ontbreekt in `.env.local`, of je kijkt naar een deploy |
| De app start niet: "AUTH_DEV_LOGIN staat aan, maar APP_ENV is niet local" | `APP_ENV=local` ontbreekt, meestal na `vercel env pull`; zet hem terug in `.env.local` |
| `pnpm db:seed` weigert | `SEED_TARGET` ontbreekt of wijst naar een andere branch dan `DATABASE_URL`; dat is de bedoeling |
| `pnpm db:app-login` weigert | `PRODUCTION_DB_ENDPOINT` ontbreekt in `.env.local`, of `DATABASE_URL` wijst naar productie; allebei met opzet |
| "permission denied" in `pnpm dev` of de e2e, terwijl de scripts werken | De app werkt als de rol van de app en die mist een recht of een regel: `pnpm check:grants` wijst de tabel aan. Een eigen tabel zonder `appRowAccess()` is de gebruikelijke oorzaak |
| `pnpm doctor` zegt LATER over `DATABASE_URL_APP` | De app werkt nog als eigenaar; draai stap 4b |
| `.env.local` wijst naar `seed`, maar `pnpm dev` of `pnpm invite` werkt toch op `dev` | `DATABASE_URL_APP` wijst nog naar `dev`, en de app leest die het eerst; zet er tijdelijk een `#` voor (stap 4c) |
| Een pnpm-script faalt met "is not recognized" en een half pad | Een `&` in de gebruikersnaam van Windows breekt geneste `pnpm`; de scripts van het template roepen daarom `node` rechtstreeks aan. Schrijf eigen scripts net zo |
| `next build` faalt op een ontbrekende BUILD_ID | `next build` is gestart met een `--env-file`-vlag; de scripts doen dat bewust niet |

## Vul in

Noteer dit in `docs/inrichting.md`, niet in dit bestand (zie `00-checklist.md`).

| Wat | Waarde |
|---|---|
| Node- en pnpm-versie | |
| Endpoint-id van `dev` (`SEED_TARGET`) | |
| Datum waarop `seed` voor het laatst is gevuld | |
| Datum ingericht | |
