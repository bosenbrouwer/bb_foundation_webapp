<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 03. Vercel

**Wat het is.** Vercel bouwt de tool bij elke push en zet hem online: een preview per pull request en
productie vanaf `main`. **Tijd:** een half uur.

**Doe dit na** 02. **Daarna kun je** de database aanmaken (04) en de variabelen zetten (06).

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| Een Vercel-account op het adres van de organisatie, aangemeld via GitHub | Dan ziet Vercel de repo meteen | |
| Owner van de GitHub-organisatie | Vercel vraagt toegang tot de repo | |
| Een creditcard, pas bij Pro | Hobby is gratis en genoeg om te bouwen | later |

## Wat je aanmaakt

| Wat | Naam | Waar de waarde heen gaat |
|---|---|---|
| Een team | de naam van je organisatie | nergens |
| Een project | de slug van je project | het adres `<slug>.vercel.app` komt in `project.config.json` als `productionUrl` zodra je het weet |

## Stappen

1. Ga naar vercel.com en kies **Continue with GitHub**. Maak via het menu linksboven een **Team** aan
   met de naam van je organisatie. Plan: **Hobby** zolang je bouwt.
   **Controle:** het team staat in het menu en jij bent Owner.
2. **Add New, Project**, kies de repo. Staat hij er niet: **Adjust GitHub App Permissions** en geef
   Vercel toegang tot precies die repo. Framework: Next.js (herkend). Root Directory leeg.
   Environment Variables: **nog niets**. Klik **Deploy**.
   **Controle:** de eerste deploy slaagt; de wortel van het template heeft nog geen database nodig.
3. **Settings, Functions**: Function Region op **Frankfurt (fra1)**. De database komt in Frankfurt
   en elke hop tussen regio's kost tijd op elke query.
   **Controle:** de regio staat op fra1; `vercel.json` in de repo zegt hetzelfde.
4. **Settings, Deployment Protection**: Vercel Authentication aan voor previews, zodat een
   preview-adres niet voor iedereen open staat.
   **Controle:** een preview-adres vraagt om in te loggen bij Vercel.
5. **Settings, Git**: Production Branch is `main`. Welke branches uitrollen, staat in de repo en
   niet alleen hier: `vercel.json` zet onder `git.deploymentEnabled` de soorten werkbranches op
   `false` (`feature/**`, `fix/**`, `hotfix/**`, `chore/**`, `docs/**`, `refactor/**`, `test/**`,
   `build/**`, `ci/**`, `perf/**`, `style/**`, `revert/**` en `dependabot/**`). Er staat bewust geen
   regel die alles uitzet, zodat `main` nooit per ongeluk meegaat: `main` en `release/next` rollen
   uit. `pnpm template:apply` zet die lijst in `vercel.json` als de sleutel `git` er nog niet staat,
   en laat hem daarna met rust.

   Het tweede slot zet je hier met de hand, voor een branch met een naam die niet op die lijst staat.
   **Settings, Build and Deployment**, het blok **Ignored Build Step**: zet Behavior op **Custom** en
   plak deze opdracht:

       if [ "$VERCEL_GIT_COMMIT_REF" = "main" ] || [ "$VERCEL_GIT_COMMIT_REF" = "release/next" ]; then exit 1; else exit 0; fi

   `exit 1` betekent bouwen, `exit 0` overslaan. Vercel bouwt dan alleen productie en de vaste
   preview van `release/next`. Een andere branch, ook die van Dependabot (02), kost zo geen build en
   geen databasebranch in Neon, en op die preview zou toch niemand kunnen inloggen.
   **Controle:** een push op een branch als `feature/proef` levert geen deployment op; een push op
   een branch met een andere naam staat in **Deployments** als Canceled; een push op `release/next`
   bouwt. Elke ronde gaat zo via `release/next` en zijn preview; zie 09.
6. Noteer het adres onder **Domains** (`<slug>.vercel.app`). Wil je een eigen domein, koppel het dan
   nu: de redirect-URI van de inlog (05) moet erop matchen en dat achteraf wijzigen is een extra
   ronde.
   **Controle:** het adres toont het inlogscherm van het template.
7. Installeer de CLI op je machine en koppel de map: `npm i -g vercel`, `vercel login`, en in de
   map van de repo `vercel link` (kies het team en het project).
   **Controle:** `vercel env pull .env.local` schrijft een bestand (nog bijna leeg).
8. **Firewall** in de zijbalk van het project: één eigen regel, een rem per adres op het inlogscherm.
   Kies rechtsboven **Configure**, dan **+ New Rule**. Naam: `inlog per adres`. Onder **If**:
   **Request Path**, **Equals**, `/sign-in`. Daar komt elke poging binnen, met Microsoft en met
   wachtwoord. Onder **Then**: **Rate Limit**, **Fixed Window**, **Time Window** 60 seconden,
   **Request Limit** 20, als sleutel **IP**, en als actie eerst **Log**: die houdt niets tegen, je
   ziet alleen wat de regel zou doen. Klik **Save Rule**, dan rechtsboven **Review Changes** en
   **Publish**. Op Hobby is dit de ene regel met een rem die je per project hebt.
   **Controle:** de regel staat in de lijst. Kijk na een week op het overzicht van de Firewall wat hij
   heeft gelogd. Was dat nooit een gewone gebruiker, zet de actie dan op **Too Many Requests (429)**.

   Zoek ook de noodknop, maar zet hem niet aan: het menu **⋯** rechtsboven op het overzicht van de
   Firewall, **Enable Attack Mode**. Bij een aanval laat die alleen bezoekers door die een controle in
   de browser halen, voor een uur, zes uur of een dag. Je crons en je eigen functies gaan er gewoon
   langs. Uit zetten: hetzelfde menu, **Disable Attack Mode**.
   **Controle:** het menu **⋯** toont **Enable Attack Mode**. Klik niet verder: sluit het menu.

## Waarom zo

Een team in plaats van een persoonlijk account, om dezelfde reden als bij GitHub. Frankfurt, omdat de
data in de EU blijft en de database daar staat. Geen preview zonder pull request, omdat elke preview
een bouwminuut en een databasebranch kost en een losse push niets oplevert wat een pull request niet
ook geeft. En geen preview per werkbranch: elke `feature/...`-branch een eigen preview met een eigen
databasebranch liep in een eerder project tegen de limiet van het aantal branches aan. Twee sloten,
omdat een instelling in een console een keer verdwijnt en een regel in `vercel.json` meegaat met de
code.

## Beveiliging

- De variabelen staan alleen hier (06). Zet **Sensitive** aan bij elk geheim: daarna is de waarde niet
  meer terug te lezen, alleen te vervangen.
- Deployment Protection houdt previews dicht. Productie is openbaar tot aan het inlogscherm; dat is
  de bedoeling, en `pnpm smoke:prod` controleert dat alles erachter dicht is.
- De tool zet zelf security headers; je hoeft daar niets voor te doen. De Content-Security-Policy
  komt uit `proxy.ts` (zo heet middleware in Next 16), met per verzoek een nonce, zodat de browser
  alleen de eigen scripts uitvoert. De vaste headers (nosniff, geen framing, HSTS) staan in
  `lib/config/next-base.ts`. De proxy stuurt bovendien wie geen sessiecookie heeft meteen naar de
  inlog, behalve op de paar openbare adressen (`lib/auth/public-paths.ts`). Dat is een extra ring en
  geen grens: wie wat mag, blijft `requireSession()` in de code regelen, en `pnpm check:public` bewijst
  in de CI dat elke pagina ook zonder de proxy dicht is.
- Eén eigen regel in de firewall (stap 8) remt het versturen naar het inlogscherm per adres, vóór de
  tool er iets van ziet. De tool heeft zijn eigen rem per adres en per account; deze komt erbij.

## Kosten

Plan: **Hobby** tijdens het bouwen, gratis. **Pro** zodra er echte gebruikers zijn: het Hobby-plan
staat commercieel gebruik niet toe, en een cron draait er maar één keer per dag. Plafond: op Pro
staat **Spend Management** aan met een hard bedrag; op Hobby is er niets te overschrijden. Uit je
checklist: het deel voor Vercel, met de seat per bouwer erbij op Pro. Upgraden is pas nodig bij de
livegang met gebruikers, of eerder als een cron vaker dan dagelijks moet. Laat Fluid compute aan, en
Web Analytics en Observability uit zolang je ze niet gebruikt: de rekening loopt op door crons,
previews en extra's (les L-VRC-08). Stand van oktober 2026; controleer het Hobby-beleid als je
twijfelt.

## Zo zie je dat het goed staat

- Een pull request krijgt binnen een paar minuten een preview-adres en een groene check. Vanaf
  `release/next` is dat altijd hetzelfde adres (09).
- Een merge naar `main` zet een nieuwe deploy op productie, en het inlogscherm toont de nieuwe versie.
- **Settings, Functions** zegt fra1; **Settings, Cron Jobs** toont de crons uit `vercel.json`. Kijk
  dat na de eerste deploy echt na: zonder regio in de repo kiest Vercel er een buiten Europa (les
  L-VRC-09). In Neon staat de regio op de Overview van het project.
- Onder **Firewall** staat de regel `inlog per adres`.

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| De deploy faalt met een melding over `DATABASE_URL` | De build draait `pnpm db:deploy`; zonder database (04) en variabelen (06) kan dat niet. Volg eerst 04 en 06 |
| Een preview komt uit op productie-data | De Neon-integratie maakte geen branch (geen pull request) en `PRODUCTION_DB_ENDPOINT` staat niet; zie 04 |
| Een gewijzigde variabele doet niets | Een variabele geldt pas na een nieuwe deploy: **Deployments, Redeploy** |
| "Hobby plan does not allow cron jobs more frequent than daily" | Een rooster in `vercel.json` staat vaker dan dagelijks; zet het op dagelijks of ga naar Pro |
| Een push op `feature/...` of `fix/...` levert geen deployment op | Met opzet: `vercel.json` zet die soort branch uit onder `git.deploymentEnabled`. Testen doe je op de preview van `release/next` (09) |

## Vul in

Noteer dit in `docs/inrichting.md`, niet in dit bestand (zie `00-checklist.md`).

| Wat | Waarde |
|---|---|
| Team | |
| Project | |
| Productieadres | |
| Plan en plafond | |
| Datum aangemaakt | |
