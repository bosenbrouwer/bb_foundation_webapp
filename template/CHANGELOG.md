<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Changelog van het template

Per versie: wat verandert, wat kan botsen bij het bijwerken van een project, en wat een project
daarna met de hand moet doen. `pnpm template:update` toont de secties tussen de oude en de nieuwe
versie na het bijwerken.

## Nog niet uitgebracht

### Wat verandert

- Nog niets.

### Let op bij bijwerken

- Nog niets.

## v1.9.0 (18 november 2026)

### Wat verandert

Drie besluiten van 18 november 2026 uitgevoerd: een rem op de rekening van AI die een beheerder zelf
ziet en bedient, de veiligheidslijst als bestand van het project, en Gitleaks van advies naar poort.

- **Module ai: een maandplafond en een noodstop, voor de hele organisatie.** Onder Beheer, AI staat
  een nieuwe rubriek Grenzen. De noodstop zet elke prompt in één keer uit, met wie hem zette en
  wanneer. Het maandplafond is een bedrag per kalendermaand in de valuta van de prijzen; op 100%
  weigert `runPrompt` tot de eerste van de volgende maand of tot een beheerder het verhoogt, en vanaf
  80% waarschuwen Beheer, AI en Beheer, Systeem. De stand is de som van `ai_requests`, er is geen
  aparte teller. Met een plafond wordt een model zonder prijs geweigerd, omdat zo een verzoek niet
  te tellen is. Nieuw: de tabel `ai_limits` en een index op `ai_requests` (schemaversie 2 van de
  module), `lib/ai/budget.ts` met de pure toets, `loadLimits`, `saveMonthlyCap` en
  `setEmergencyStop` in `lib/ai/settings.ts`, `monthSpend` in `lib/ai/usage.ts`, en rubriek 8 in
  `pnpm check:ai`. `runPrompt` kent drie nieuwe redenen: `stopped`, `monthLimit` en `noPrice`, elk
  met een tekst in `labels.ai.outcome`. Besluit A6 in `docs/modules/ai.md`. Het plafond is niet de
  harde grens: de toets loopt vooraf en de kosten zijn pas achteraf bekend. Niet tegen een database
  bewezen.
- **`runPrompt` toetst de sleutel als laatste.** De volgorde is nu: het recht, de noodstop, de prompt,
  de daglimiet, het maandplafond, de sleutel. Zo kan `pnpm check:ai` de grenzen zonder sleutel
  bewijzen. Wie de daglimiet bereikt in een omgeving zonder sleutel, ziet nu de melding van de
  daglimiet en niet meer die van de sleutel.
- **De veiligheidslijst is een bestand van het project.** `docs/veiligheid.md` is een nieuwe seed: 31
  punten in acht groepen, elk met bouwen, instellen of afspreken, een stand en een aanwijzing naar
  wat het template levert, en bovenaan een eigenaar en een datum. Het patroon
  `docs/patronen/veiligheidschecklist.md` is de uitleg erbij; de checklist (handleiding 00) en
  handleiding 30 verwijzen ernaar. Besluit D23.
- **Gitleaks is een poort.** De stap over de historie in `.github/workflows/ci.yml` draait zonder
  `continue-on-error` en heet niet meer advies: een vondst maakt de run rood. Besluit D22. Semgrep
  blijft advies; handleiding 02 zegt hoe je een vals alarm per regel uitzet.
- **Apply: een nieuwe schemaversie van een module in een vers project.** In een vers project zit het
  hele schema van een module in haar eerste migratie, en voor een latere schemaversie valt er niets
  meer te genereren. De terugweg van die latere versie komt nu vooraan in de terugweg van de eerste
  migratie, in plaats van te ontbreken, en de waarschuwing dat er niets gegenereerd is blijft weg.
  Een bestaand project krijgt een eigen migratie met haar eigen terugweg, zoals voorheen
  (`template/lib/drizzle.ts`, `template/lib/apply.ts`; regel 4b in `template/README.md`). Bewezen
  zonder database: een project op v1.8.0 met alle modules kreeg bij het bijwerken precies één
  migratie met de nieuwe tabel, het slot en de index, en de gouden test dekt het verse project.

### Let op bij bijwerken

- **Module ai, de database:** `pnpm template:update` maakt een migratie `template_ai_2` met de tabel
  `ai_limits` en een index, en zet haar terugweg erbij. Bekijk allebei, draai `pnpm db:roundtrip` op
  je dev-branch en `pnpm check:ai`, en commit ze met de rest. Zonder die migratie op productie faalt
  elke aanroep van `runPrompt`: hij leest de nieuwe tabel als eerste.
- **Module ai, de redenen:** `AiFailure` heeft er drie waarden bij. Een server action die
  `labels.ai.outcome[reason]` toont, hoeft niets te doen. Een eigen `switch` over de redenen of een
  eigen tekst per reden vul je aan met `stopped`, `monthLimit` en `noPrice`.
- **Module ai, de prijzen:** zet je een maandplafond, vul dan eerst de prijs in van elk model dat een
  prompt gebruikt. Een prompt met een model zonder prijs wordt met een plafond geweigerd; Beheer, AI
  noemt de modellen.
- **De CI:** Gitleaks is nu een poort. Een project dat nog een vondst in zijn historie heeft, krijgt
  een rode run tot het geheim is ingetrokken en uit de historie is, of de valse bevinding met zijn
  reden in `.gitleaks.toml` staat. De stap noemt per vondst de regel, het bestand en de commit.
- **De veiligheidslijst:** `docs/veiligheid.md` komt er als nieuw bestand bij. Heeft je project die
  lijst al onder die naam, dan blijft je eigen bestand staan; leg de twee dan naast elkaar.

## v1.8.0 (17 november 2026)

### Wat verandert

AI en veiligheid, uit lessen van een eerder project tot en met 17 november 2026: vier plekken waar
dat project een model gebruikt, een doorlichting als aanvaller, en een nachtronde die dagenlang
stilstond op één fout.

- **Beveiliging: Next.js 16.4.6** (en `eslint-config-next` 16.4.6). Op 16.2.0 tot en met 16.4.4
  staan twee meldingen (matig) over een cache die lekt tussen waarden van een root-parameter bij
  `'use cache'`; opgelost vanaf 16.4.5. Het template gebruikt die functie niet, een project kan dat
  wel. `next build` van 16.4.2 stopte op 17 november 2026 op die melding; `pnpm audit --prod` is
  met 16.4.6 schoon. De versie is ouder dan de wachttijd van een week.
- **De deploy zet de organisatie neer.** `pnpm db:deploy` roept na de migraties `ensureBaseData`
  aan (hetzelfde als `pnpm db:bootstrap`). Geen migratie maakt de organisatierij en geen handleiding
  liet dat script op productie draaien: op een verse productiedatabase faalden de eerste inlog en
  `pnpm invite`. Besluit D21. Niet tegen een database bewezen.
- **Eén fout zet de nacht niet stil.** `runSteps` en `stepsResponse` in `lib/cron/steps.ts`: elke
  ronde van een cronroute is een stap met zijn eigen opvang; een stap die gooit, wordt gemeld met
  zijn naam, de volgende loopt door, en het antwoord is een 500 met de mislukte stappen. `runPrune`
  loopt erop, en ook de crons van de modules jobs (verwerken, opruimen) en messaging (versturen,
  vastloopcontrole, opruimen). Besluit D15.
- **Een foutmelding die zegt waarom, zonder de rij.** `causeTags` in `lib/monitoring/report.ts`
  loopt de keten van `cause` af en zet de code en, bij een databasefout, de naam van de check of
  index, de tabel en de kolom als labels achter de regel in de log. `message` en `detail` van de
  oorzaak gaan nooit mee. Besluit D16.
- **De CSP op elk adres.** De proxy slaat alleen `/api`, de bestanden van Next en een pad dat op de
  extensie van een bestand eindigt over; een pagina met een punt in het adres krijgt de nonce. De
  eigen HTML-pagina's van Auth.js onder `/api/auth` krijgen een vaste CSP zonder scripts
  (`STATIC_CSP`). Test `lib/security/csp-coverage.test.ts`, e2e `05b` uitgebreid. Besluit D17.
- **Module auth-entra: geen deploy zonder de eigen tenant.** Ontbreekt
  `AUTH_MICROSOFT_ENTRA_ID_ISSUER` in een preview of in productie, of wijst hij naar `common`,
  `organizations` of `consumers`, dan gooit de provider bij het opstarten
  (`lib/auth/providers/entra-issuer.ts`). Besluit D18.
- **De CI.** Draait ook op een push naar `release/next`. Nieuw in de job met de scans:
  `pnpm check:licenses` (`scripts/check-licenses.mjs`: geen GPL of AGPL in wat naar productie gaat,
  LGPL mag, een onbekende licentie waarschuwt) als poort, en Gitleaks over de hele git-historie op
  een vaste versie met checksum, als advies tot een run beoordeeld is; de valse bevindingen staan
  met hun reden in `.gitleaks.toml` (van het project). `check:licenses` staat ook in
  `pnpm check:all`. Besluit D19. De stap met Gitleaks toont per vondst de regel, het bestand en de
  commit, met de waarde weggelakt. Twee testwaarden die Semgrep bij de eerste run als geheim aanzag
  (een verzonnen JWT in `report.test.ts` en het testgeheim uit RFC 6238 in `totp.test.ts`), staan
  per regel uit met de reden. Gitleaks vond dezelfde twee in de historie; ze staan met hun reden
  in `.gitleaks.toml`, zodat een nieuw project er schoon mee begint. Een derde vondst zit alleen in
  de historie van het template zelf (een testwachtwoord in een script dat sinds v1.3.0 weg is) en
  staat als vingerafdruk in `.gitleaksignore`.
- **Welke branches uitrollen.** `vercel.json` krijgt `git.deploymentEnabled`: de soorten
  werkbranches (`feature/**`, `fix/**`, `dependabot/**` en tien andere) krijgen geen eigen preview
  meer; `main` en `release/next` rollen uit. Besluit D20.
- **Een preview zonder echte gegevens.** Handleiding 04, 07, 09 en de checklist: de parent van een
  preview is een branch `seed` met alleen de seed, de default branch van het Neon-project; de
  productiebranch blijft de production branch. Vóór deze versie zei handleiding 09 dat de preview
  een kopie van productie was.
- **Kleine helpers voor invoer van buiten:** `uuidOrUndefined` (`lib/domain/ids.ts`), `oneOf`
  (`lib/domain/one-of.ts`) en `escapeLike` (`lib/domain/like.ts`), elk met test. Een vreemd id, een
  onbekende keuze of een joker in een zoekveld is een 404 of een lege lijst, geen 500.
- **Module ai: een antwoord is invoer.** `keyed` (korte sleutels in plaats van id's) en `enumOr`
  (een onbekende keuze wordt de keuze die niets doet) in `lib/ai/keys.ts`.
- **Module ai: de witte lijst, bewezen.** `outgoingText` en `smuggled` in `lib/ai/outgoing.ts` voor
  de smokkeltest per prompt, en rubriek 7 van `pnpm check:ai`, die de gevallen uit
  `scripts/check-ai.project.ts` (van het project) tegen de database draait. De check haalt de
  sleutel van het model eerst uit de omgeving.
- **Module ai: platte tekst.** `PlainText` (`components/ai/plain-text.tsx`), door `ProposalView`
  gebruikt voor elke tekst van het model, en de huisregel `ai-output`: een bestand dat iets van de
  module toont, bevat geen `dangerouslySetInnerHTML`, geen markdown-renderer en geen linkmaker.
- **Module ai: wie de module mag gebruiken.** De huisregel `ai-imports`: `@/lib/ai` alleen vanuit
  de mappen van de module zelf en de mappen in `PROJECT_AI_IMPORT_ROOTS`
  (`scripts/house-rules/project-rules.mjs`), en nooit vanuit een map voor gasten of klanten.
- **Module ai: een nagemaakt model.** Met `AI_FAKE=1` en `APP_ENV=local` antwoordt
  `lib/ai/fake.ts` in de vaste structuur van de prompt, door dezelfde toets, zonder sleutel en
  zonder netwerk; buiten lokaal gooit het. `playwright.config.ts` geeft de server van de e2e
  `SAFE_SERVER_ENV` mee (`scripts/lib/safe-server-env.ts`): de sleutel leeg en het nagemaakte model
  aan. Besluit A5 in `docs/modules/ai.md`.
- **Module messaging: Teams buiten productie alleen naar een testkanaal.** `TEAMS_WEBHOOK_URL` wordt
  alleen in productie gelezen; elders telt alleen `TEAMS_WEBHOOK_URL_TEST`, en zonder die gaat er
  niets uit. Besluit M1 in `docs/modules/messaging.md`.
- **Module files: de grens in de browser.** `FileInput` houdt een bestand boven de grens van het
  doel tegen vóór het versturen (`SizedFileInput`). Besluit F1 in `docs/modules/files.md`.
- **Lessen:** een nieuwe laag `docs/lessen/ai.md` (L-AI-01 tot 11), en L-WERK-13 tot 17, L-AUTH-08
  tot 10, L-NEXT-20 tot 22, L-NEON-12 en 13, L-WIN-08 en 09.
- **Patronen:** `ai-gesprek`, `ai-meten`, `omgeving-per-adres`, `accounts-van-buiten`,
  `intrekbare-sessie`, `tweede-app-in-de-repo`, `eigenaar-boven-beheerder`,
  `niemand-beslist-over-zichzelf` en `veiligheidschecklist`. Acht van de negen staan niet in code in
  het template: ze zeggen hoe een project het bouwt.
- **CLAUDE.md:** regel 5 (in een log die je niet kunt opschonen staan sleutels en aantallen, nooit
  inhoud), regel 11 (de helpers voor invoer van buiten), regel 17 (ook een action die het quotum van
  een gedeelde sleutel kost), de batterij met `check:licenses`, "zeg wat bewezen is en wat niet", en
  vijf nieuwe rijen in de tabel met lessen en patronen. Het blok van de module ai is herschreven.
- **Documenten nagelopen op tegenspraak met de code** (veertig bevindingen): onder meer wat
  `pnpm entra:status` en `pnpm db:status` echt tonen, de sleutel van tweestapsverificatie
  (`MFA_SECRET_KEY`), `appRowAccess()` in elk voorbeeld van een tabel, de CSP in handleiding 03 en
  L-NEXT-13, het rooster van een kwartiercron (werkuren), en invullen en afvinken in een eigen
  `docs/inrichting.md` in plaats van in een bestand van het template. `OVERDRACHT.md` is weg.

### Let op bij bijwerken

- **Next.js 16.4.6:** `pnpm install` na de update, en bouw één keer lokaal.
- **De deploy draait `scripts/lib/bootstrap.project.ts` nu elke keer**, ook op productie. Dat
  bestand hoort alleen upserts te bevatten; staat er iets in dat bij herhaling verdubbelt, maak het
  dan eerst idempotent.
- **Het antwoord van een cronroute heeft een andere vorm:** `{ "results": { ... }, "failed": [ ... ] }`
  in plaats van de tellingen op het hoogste niveau. Leest een eigen script of test het antwoord van
  `/api/cron/prune`, `/api/cron/jobs` of `/api/cron/outbox`, pas het dan aan. `runPrune` geeft nu
  `{ results, failed }` terug. Een eigen cronroute met meer dan één ronde: zet de rondes in
  `runSteps`.
- **Inloggen via Microsoft:** staat `AUTH_MICROSOFT_ENTRA_ID_ISSUER` niet in Vercel voor Production
  én Preview, dan faalt de eerstvolgende build daar, met een melding die zegt wat te zetten
  (handleiding 05).
- **De huisregel `ai-imports`** (alleen met de module ai): elke map buiten de module die `@/lib/ai`
  importeert, moet in `PROJECT_AI_IMPORT_ROOTS` staan. Die lijst staat in
  `scripts/house-rules/project-rules.mjs`, een bestand van het project dat een update niet
  overschrijft: voeg `export const PROJECT_AI_IMPORT_ROOTS = ["app/(app)/<map>/", "lib/<map>/"];`
  zelf toe. Tot dan weigert `pnpm lint` en zegt hij welke map.
- **De huisregel `ai-output`:** een scherm dat een voorstel toont met een markdown-renderer of
  `RichText`, zet je om naar `PlainText`.
- **Teams:** staat `TEAMS_WEBHOOK_URL` ook in Preview of in `.env.local`, dan gaat daar niets meer
  uit. Wil je buiten productie testen: maak een testkanaal met een eigen webhook en zet die in
  `TEAMS_WEBHOOK_URL_TEST` (handleiding 21).
- **`vercel.json`:** apply zet `git.deploymentEnabled` alleen als er nog geen `git` in staat. Een
  werkbranch krijgt daarna geen preview meer; zet wat je wilt bekijken op `release/next`.
- **De preview:** een bestaand project houdt zijn previews als kopie van productie tot je de branch
  `seed` hebt gemaakt en als default hebt gezet (handleiding 04, "Een seed-branch achteraf"). Lees
  de waarschuwing daar over de lijst van gedraaide migraties.
- **De CI:** `.gitleaks.toml` komt er als nieuw bestand bij. De stap met Gitleaks staat op advies:
  loop de eerste uitkomst na, zet een valse bevinding met de reden in dat bestand, en trek een echte
  in bij de dienst waar hij vandaan komt.
- **`pnpm check:ai`** leest nu `scripts/check-ai.project.ts`; apply zet dat bestand neer.

## v1.7.0 (29 oktober 2026)

### Wat verandert

- **De CSP draagt een nonce per verzoek.** `proxy.ts` (zo heet middleware in Next 16) maakt per
  verzoek een nonce en zet de policy uit `lib/security/csp.ts` op het verzoek en op het antwoord;
  Next zet de nonce op zijn eigen scripts. `script-src 'self' 'nonce-...' 'strict-dynamic'`, zonder
  `'unsafe-inline'`: een script dat niet van ons is, draait niet, ook niet als er ergens HTML
  ontsnapt. `style-src` houdt `'unsafe-inline'` (React zet `style`-attributen), `worker-src 'self'`
  staat er uitdrukkelijk, `object-src 'none'` en `manifest-src 'self'` zijn nieuw. De vaste CSP uit
  `lib/config/next-base.ts` is weg; de andere headers blijven daar. Besluit D14.
- **e2e `05b-csp.spec.ts`:** de header, een andere nonce per verzoek, de nonce op elk `<script>` in
  de HTML van de server, één CSP-header, geen weigering in de console, en een paneel dat opengaat
  (gehydrateerd) op het inlogscherm en vier schermen achter de inlog.
- **CLAUDE.md, handleiding 30, `docs/modules/core.md`** en de lessen L-NEXT-17 en 18 zeggen het.
- **De supply chain:** `minimumReleaseAge: 10080` in `pnpm-workspace.yaml`, een week wachttijd op
  elke nieuwe pakketversie, ook indirect; dezelfde week als de cooldown van Dependabot. Les
  L-WERK-12 zegt waarom (de npm-wormen van 2025 en 2026).
- **Module auth-password: geen reset poisoning.** `appOrigin()` bouwt de koppeling in een mail niet
  meer uit `Host` of `X-Forwarded-Host`, behalve op Vercel (dat die header zelf zet) en lokaal.
  Zonder `AUTH_URL` of `productionUrl` op een andere host weigert hij.
- **Les L-NEXT-19:** middleware is geen beveiligingsgrens; in anderhalf jaar drie keer omzeild.

### Let op bij bijwerken

- Elke pagina wordt dynamisch gerenderd (de nonce is per verzoek); de route-lijst van de build toont
  niets meer als statisch. Voor een app achter een inlog verandert dat niets wezenlijks.
- Klik na de eerste uitrol één keer door elk scherm, met de console open: een script dat de nonce
  mist, faalt stil. Een eigen `<script>` of `next/script` in het project krijgt de nonce uit
  `(await headers()).get("x-nonce")`.
- `pnpm install` weigert voortaan een versie die jonger is dan een week, ook als je hem zelf in
  `package.json` zet. Heb je een security-update eerder nodig, zet het pakket dan tijdelijk in
  `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`, met de reden erbij.
- Draait het project niet op Vercel en is `productionUrl` leeg: zet `AUTH_URL` in de omgeving,
  anders weigert de module auth-password een uitnodiging of herstelmail te maken.
- Had het project een eigen `middleware.ts` of `proxy.ts`: voeg de nonce en de header toe aan die
  van jou, of neem `proxy.ts` over met `pnpm template:adopt proxy.ts`. Twee bestanden kunnen niet
  naast elkaar bestaan.
- Een eigen CSP-header in `next.config.ts`: weghalen, anders dwingt de browser allebei af.

## v1.6.0 (29 oktober 2026)

### Wat verandert

De databaseronde en de rand, uit lessen van een eerder project van 29 oktober 2026: wat er misging
toen de app daar als zijn eigen rol ging verbinden, en wat het aanvalsscript daarna nog vond.

- **De rol van de app.** De migraties van core maken `app_rw`: lezen en schrijven in `public`, de
  migratiestand lezen, de audit log alleen aanvullen, geen DDL. De app verbindt ermee via
  `DATABASE_URL_APP` (`lib/db/client.ts`), op productie met de hand gezet (handleiding 04) en lokaal
  door `pnpm db:app-login`, zodat `next dev` en de e2e net als productie werken. `pnpm check:grants`
  bewijst de rechten, en met een tijdelijke rol zonder regel dat het slot dicht is. Besluit D13.
- **Row Level Security op elke tabel, met één regel.** `appRowAccess()` uit `lib/db/schema/rls.ts`
  staat op elke tabel van core en van elke module; drizzle zet het slot en de regel zelf in de
  migratie (`entities.roles` in `drizzle.config.ts`), en `rls.test.ts` faalt bij een tabel zonder.
  Een Data API die iemand aanzet, een rol die erbij komt of een gelekte verbinding zonder de rol van
  de app ziet daarna niets. CLAUDE.md regel 16.
- **De eigenaar met een eigen variabele.** `ownerUrl()` (`lib/db/owner-url.ts`) kiest in productie
  `DATABASE_URL_OWNER`, elders telt die niet; zo is het wachtwoord van de eigenaar te draaien zonder
  de knoppen van de Neon-integratie (handleiding 30). `pnpm db:deploy` weigert in productie als de
  verbinding naar een ander endpoint dan `PRODUCTION_DB_ENDPOINT` wijst
  (`scripts/lib/production-guard.ts`, met test).
- **Huisregel `session-first`.** In een `"use server"`-bestand begint elke geëxporteerde functie met
  `await requireActor()` of `requireSession()`, vóór elke blik op de invoer. Een bewust anonieme
  action krijgt een commentaar met `session-first:` en de reden; de actions van het template
  hebben die. CLAUDE.md regel 11.
- **Module messaging: een knop alleen naar het eigen adres.** Een alinea met alleen een koppeling
  wordt nog een knop als het adres op `productionUrl` uit `project.config.json` of op `AUTH_URL`
  staat; een ander adres blijft tekst.
- **Over de tool: een punt dat doorloopt.** Een ingesprongen regel onder een opsommingspunt hoort
  bij dat punt (`lib/domain/doc-markdown.ts`); vóór deze versie werd hij een losse alinea.
- **`pnpm doctor`** zegt LATER zolang `DATABASE_URL_APP` ontbreekt, ACTIE als die naar een andere
  branch wijst, en LATER als `DATABASE_URL_OWNER` lokaal staat.
- **CLAUDE.md:** regel 5 (geen gezondheid of vrije tekst in de audit log), 11, 16 en 17 (een rem op
  alles wat van buiten te raken is, per adres of per account, geteld vóór het werk), en "handwerk,
  één stap per bericht".
- **Handleiding 04, 06, 07, 30 en de checklist:** de Data API uit, de productiebranch beschermd, het
  herstelvenster van Free (zes uur), de rol van de app op productie met de controle in
  `pg_stat_activity`, de drie variabelen en wie ze leest, `PRODUCTION_DB_ENDPOINT` ook in
  Development, en het draaien van het wachtwoord van de eigenaar zonder Rotate secrets.
- **Twaalf lessen** in `docs/lessen/`: L-NEON-09 tot 11, L-DRZ-17 en 18, L-WERK-09 tot 11,
  L-NEXT-17 en 18, L-AUTH-07, L-WIN-07; L-NEON-07 en L-VRC-06 bijgewerkt.
- **Apply:** de driftcontrole loopt vóór het overschrijven van de bestanden, zodat een module die
  al een schema had een nieuwe schemaversie kan krijgen (core 1 naar 2).

### Let op bij bijwerken

- `pnpm template:update` genereert in je project twee migraties voor core, `template_core_2` (de
  rol, het slot en de regel op elke tabel die het schema dan kent) en `template_core_2_custom` (de
  rechten), met hun terugweg. Lees ze, draai `pnpm db:roundtrip` op je dev-branch en commit ze.
- Eigen tabellen: `rls.test.ts` wijst elke tabel zonder `appRowAccess()` aan. Zet hem in het blok
  met indexen, `pnpm db:generate --name=<naam>`, schrijf de terugweg (`DROP POLICY` en `DISABLE ROW
  LEVEL SECURITY` per tabel).
- Zet `PRODUCTION_DB_ENDPOINT` ook in Vercel voor Development en in `.env.local`, en draai
  `pnpm db:app-login` (handleiding 07). Na elke `vercel env pull` opnieuw.
- Op productie, na de uitrol: de inlogrol en `DATABASE_URL_APP` (handleiding 04, "De rol van de
  app op productie"). Zonder die variabele werkt de app als eigenaar, zoals voorheen.
- Een eigen server action die eerst naar de invoer keek, wijst de huisregel `session-first` aan: zet
  de sessie vooraan, of markeer hem met `session-first:` en de reden.
- Module messaging: zonder `productionUrl` in `project.config.json` en zonder `AUTH_URL` wordt geen
  enkele koppeling in een mail meer een knop. Zet `productionUrl` zodra het adres bekend is.

## v1.5.0 (27 oktober 2026)

### Wat verandert

Beveiliging uit een audit van een eerder project: de gaten die projecten nu van het template erven.

- **Een deploy is nooit lokaal.** `APP_ENV=local` won van `VERCEL_ENV`, en `.env.example` zet hem
  samen met `AUTH_DEV_LOGIN=1`. Wie dat bestand in bulk in Vercel importeerde, zette op een preview een
  inlog zonder wachtwoord open. Nu wint de deploy (`preview` of `production`) en gooit de dev-login bij
  het laden; `development` van `vercel env pull` blijft lokaal (`lib/domain/deploy-environment.ts`,
  met test). Handleiding 06 en de les in `authjs.md` zeggen het.
- **Module messaging: een naam van buiten op één regel.** Een naam met witregels en een adres ertussen
  werd in de mail aan de beheerders een eigen alinea, en dus een knop naar elke site.
  `oneLineUntrusted` in `lib/messaging/mail-html.ts` (met test) zet stuurtekens, regelscheiders en
  witruimte om in één spatie; het hulpformulier op het inlogscherm gebruikt hem voor de naam. Daar
  komt de grens per adres nu ook vóór het plafond voor de hele installatie, en dat plafond gaat van 5
  naar 50 per uur: drie bezoekers hielden het enige hulpkanaal anders dicht.
- **`sameId` voor ids** (`lib/domain/ids.ts`, met test, plus `isUuid`). Postgres vergelijkt een uuid
  zonder hoofdletters, `===` niet, dus een "nooit jezelf"-slot was te omzeilen met het eigen id in
  hoofdletters. De module auth-password had dat slot bij deactiveren; dat gebruikt nu `sameId`.
  `isUuid` uit `lib/files/store.ts` komt nu hiervandaan en wordt daar opnieuw geëxporteerd.
- **Drie nieuwe huisregels**: `same-id` (een `===` of `!==` tegen `actor.id`), `client-graph` (volgt
  de imports van een clientcomponent transitief tot een `"use server"`-grens en weigert database,
  `next-auth`, `node:` of een niet-publieke `process.env` onderweg) en `secret-patterns` (Azure-SAS,
  Entra-secret, webhooks van Teams en Power Automate, een ingevulde PAT, `AccountKey=`, private keys:
  wat secretlint mist). De runner wacht nu op een asynchrone regel. Tests in `rules.test.mjs`.
- **Security headers**: `Strict-Transport-Security` met `includeSubDomains` (twee jaar),
  `Cross-Origin-Opener-Policy: same-origin`, en `X-Powered-By` uit (`lib/config/next-base.ts`).
  `pnpm smoke:prod` controleert alle drie.
- **Fouten zonder parameters** (`lib/monitoring/error-text.ts`, met test): `errorForLog` en
  `errorForScreen`. De login, de rondes na het antwoord van jobs en messaging, de foutkolom van jobs en
  outbox, en de gezondheidscontroles op Beheer, Systeem zetten geen ruwe `error.message` meer in de
  log of op een scherm. `describeDbError` kan het detail van Postgres weglaten (`detail: false`).
- **Module files**: de bewaarde naam krijgt de extensie van het gecontroleerde type (`fileNameForType`:
  een `run.bat` die als CSV binnenkwam, heet `run.csv`), het pad een willekeurig stuk, en de PUT naar
  de opslag overschrijft nooit (`If-None-Match: *`). Een oud Office-formaat (.xls, .doc) wordt altijd
  geweigerd, want macro's zijn daarin niet te zien, ook als een doel het type noemt. En een rem van
  100 uploads per uur per persoon (`FILE_UPLOADS_PER_HOUR`). Twee nieuwe meldingen in beide talen.
- **Lessen**: `L-DRZ-15` (uuid en hoofdletters), `L-DRZ-16` (de reden zit in `cause`) en een regel in
  `L-NEXT-16` over een test die "de tabel" pakt.
- **`docs/THEME.md`, paragraaf 8: van een design system naar dit project.** Wat je uit een design system
  (Claude Design, Figma, een huisstijlgids) overneemt in `project.config.json`, `public/brand/`,
  `public/fonts` en `app/project.css`, en wat niet: componenten bouw je niet na. De oude paragraaf 8
  (voordat je een scherm mergeet) is nu 9.
- **Het template staat op een nieuw adres**: `https://github.com/bosenbrouwer/bb_foundation_webapp.git`
  in het manifest en de lock. Het oude adres stuurt door.

Bewust niet: `security.txt` had al een `mailto:` als contact, en PKCE bij OAuth speelt pas als een
module een eigen OAuth-koppeling krijgt (Auth.js doet het bij de inlog zelf).

### Let op bij bijwerken

- **Zet `template.source` in `project.config.json` op het nieuwe adres**
  (`https://github.com/bosenbrouwer/bb_foundation_webapp.git`). Het oude adres werkt via een
  doorverwijzing, maar daar wil je niet op leunen. Het template is afgeschermd: wie bijwerkt, heeft
  leesrecht op die repo nodig, en de eerste keer vraagt git om in te loggen.
- **Draai `pnpm lint`.** De drie nieuwe huisregels kunnen in eigen code afgaan: een `===` tegen
  `actor.id` (gebruik `sameId`), een clientcomponent die via een omweg servercode binnenhaalt (zet de
  waarde in een module zonder serverimport), of een letterlijk geheim (haal het weg en draai het om;
  is het aantoonbaar geen geheim, zet dan `secretlint-disable-next-line` op de regel erboven).
- **Staan `APP_ENV=local` en `AUTH_DEV_LOGIN` in Vercel**, dan start een deploy na het bijwerken niet
  meer. Dat is de bedoeling: haal ze daar weg.
- **Module files**: een doel in `lib/files/purposes.ts` dat `application/vnd.ms-excel` of
  `application/msword` noemt, neemt die niet meer aan. Een bestand dat vanaf nu binnenkomt, heet naar
  zijn gecontroleerde type; oude rijen blijven zoals ze zijn.

## v1.4.0 (25 oktober 2026)

### Wat verandert

- **Een sessie verloopt acht uur na het inloggen, ook als hij steeds ververst wordt.** Auth.js tekent
  het token bij elke sessieaanvraag opnieuw, dus `maxAge` alleen schoof mee en een sessie leefde
  eindeloos door met de rollen van het inlogmoment. Nu staat `loginAt` op het token en geeft de
  jwt-callback `null` na acht uur (`lib/auth/session-age.ts`, met test).
- **Een login neemt een bestaand account alleen op e-mailadres over als dat een dev-account uit de
  seed is.** Een tweede identiteit met dezelfde e-mailclaim kreeg anders de rij, de rollen en de
  historie van een ander; nu weigert de login met een melding in de serverlog
  (`lib/auth/email-fallback.ts`, met test).
- **De dev-login werkt alleen met `APP_ENV=local`.** Het slot op `VERCEL_ENV` faalde open op elke
  andere host. `lib/domain/deploy-environment.ts` bepaalt de omgeving (eerst `APP_ENV`, dan
  `VERCEL_ENV`, anders onbekend) en elke guard kiest bij "onbekend" de veilige kant: de dev-login
  gooit, de deploy-migratie controleert altijd behalve in productie, de seed weigert in een deploy.
  Beheer, Systeem toont de omgeving, de e2e zet `APP_ENV=local`, en `pnpm doctor` meldt een
  `APP_ENV` die niet bij de dev-login past.
- **Module auth-password: de GCM-tag van het TOTP-geheim is altijd 16 bytes**, bij versleutelen en
  openen; een kortere tag wordt geweigerd. Bestaande geheimen hebben al 16 bytes.
- **`requestOriginVerdict`** (`lib/domain/request-origin.ts`, met test): de herkomstcontrole die
  server actions van Next krijgen, voor een route handler die schrijft en op de sessiecookie leunt.
  Het template heeft er nog geen; het kernblok van `CLAUDE.md` zegt dat zo'n handler ermee begint.
- **CI**: elke action op een vaste commit-SHA met de versie als commentaar, `permissions: contents:
  read`, en twee nieuwe jobs: "Kwetsbaarheden en geheimen" (`pnpm audit --prod --audit-level=high`
  en `pnpm check:secrets` met secretlint) en Semgrep als advies (`continue-on-error` tot de eerste
  run beoordeeld en groen is). Drie nepverbindingsstrings in de code hebben een uitzondering met de
  reden erbij.
- **`.github/dependabot.yml`**: elke maandag één gegroepeerde pull request voor minor en patch, zeven
  dagen na de release (`cooldown`), majors van pakketten die samen moeten bewegen genegeerd, en de
  actions samen in één eigen pull request. Een security-update komt meteen.
- **`pnpm check:all`** bestaat nu: de hele batterij, goedkoopste eerst, rechtstreeks met `node` (nooit
  genest `pnpm`), met een tabel voor de rubriek Bewijs. Stappen tegen de database draaien als
  `.env.local` een database noemt, en worden anders zichtbaar overgeslagen (exitcode 2).
- **Ontwikkeltooling**: vitest 4.1.12 en een override voor vite 8.3.4 of hoger. `pnpm audit` toont
  daarna alleen nog de bekende matige melding op esbuild onder drizzle-kit.
- **Handleidingen**: 03, stap 5 noemde een optie die Vercel niet heeft; nu een opdracht onder Ignored
  Build Step die alleen `main` en `release/next` bouwt, zodat een branch van Dependabot geen build
  en geen database kost. 04 ruimt oude databasebranches op, 02 zet Dependabot security updates en
  het opruimen van gemergde branches aan en zegt hoe je een pull request van Dependabot meeneemt, 07
  en 06 noemen `APP_ENV`, 09 heeft een rij voor een eerste build zonder eigen database, en
  WERKWIJZE, 00, 30 en de lessen in `authjs.md` en `werkwijze.md` volgen.

### Let op bij bijwerken

- **Iedereen logt na de uitrol één keer opnieuw in**: een bestaande cookie heeft nog geen
  inlogmoment en telt als verlopen.
- **Zet `APP_ENV=local` in `.env.local`**, anders start de app lokaal niet zolang
  `AUTH_DEV_LOGIN=1` staat. `vercel env pull` haalt hem weer weg; `pnpm doctor` meldt het. Op Vercel
  verandert niets. Draait een project op een andere host, zet daar dan `APP_ENV=production` of
  `preview`.
- **`pnpm install`** na het bijwerken: secretlint en vitest zijn nieuw of nieuwer.
- **Vercel**: zet Ignored Build Step op de opdracht uit handleiding 03, stap 5. **Neon**: zet
  Automatically delete obsolete branches aan (04, stap 3). **GitHub**: zet Dependabot security
  updates en Automatically delete head branches aan (02, stap 4).
- **Controleer bij de eerste ronde** of de eerste build van `release/next` een eigen databasebranch
  in Neon krijgt. Zo niet, dan houdt de guard hem tegen; open dan de pull request en klik op
  Redeploy (handleiding 09). Dat gedrag is nog niet op een echt project nagelopen.
- Staat er al een gebruiker met hetzelfde e-mailadres maar een andere identiteit, dan lukt inloggen
  voor de tweede niet meer; de serverlog zegt wat je doet als het toch dezelfde persoon is.
- Dependabot opent op maandag zijn eerste pull requests. Neem ze mee in een ronde, niet los mergen.

## v1.3.0 (24 oktober 2026)

### Wat verandert

- **Beveiliging: Next.js 16.4.2** (en `eslint-config-next` 16.4.2). Next 16.3.6 had twee kritieke
  kwetsbaarheden zonder inlog (remote code execution via de Image Optimization API en via
  `use cache`, GHSA-2464-fhr4-w9xw), een denial of service via server actions
  (GHSA-p3m5-59mp-jv5r, raakt elk project uit het template) en een SSRF in de Image Optimization
  API. Verder `nodemailer` 10.1.7 (drie fouten in het parsen van adressen) en een override voor
  `zod` 4.6.6 of hoger, die via de Anthropic SDK binnenkomt. `pnpm audit --prod` is daarmee
  schoon; wat overblijft zit alleen in de ontwikkeltooling.
- **De wizard en het lesmateriaal staan niet meer in het template.** De map `wizard/` (de wizard,
  de pagina's van de training, de feedbackpagina, de accounts, het controlescript voor de laptop en
  de huisstijl van de organisatie) is weg, met de bijbehorende scripts in `template/ci/`
  (`wizard-smoke.mjs`, `wizard-toegang.mjs`, `schermen-opnemen.mjs`, `controle-laptop.test.ts`)
  en de job in de template-CI. Ze staan in een eigen repo, die het template op een vastgezette tag
  ophaalt en test dat wat de wizard oplevert door `template:validate` komt. Het enige contract
  tussen de twee is `project.config.json`.
- **Het template is nu zonder uitzondering neutraal:** `check-template.mjs` kent geen plekken meer
  waar merknamen mogen.
- **De handleidingen staan op zichzelf.** 00, 01, 02, 07, 08 en 10 en `docs/modules/core.md`
  verwijzen niet meer naar bestanden of delen van de wizard. De voorbereiding eindigt met een
  controle van de versies (en na het klonen `pnpm doctor`), en handleiding 10 heeft een startprompt
  voor wie zonder wizard begint: `project.config.json` uit `examples/`, het projectplan, en één
  opdracht voor Claude.

### Let op bij bijwerken

- **Werk bij, ook als je verder niets nodig hebt:** deze versie dicht twee kritieke lekken in
  Next.js. Na `pnpm template:update` draai je `pnpm install`, en de volgende deploy zet het live.
- **`wizard/` verdwijnt uit je project.** `pnpm template:update` haalt elk bestand in `wizard/` weg
  dat je niet hebt gewijzigd. Een gewijzigd bestand blijft staan, met de melding "niet meer in het
  template"; haal het zelf weg als je het niet gebruikt. Hetzelfde geldt voor de vier scripts in
  `template/ci/`.
- Verwees je eigen documentatie naar `wizard/`, pas die dan aan.

## v1.2.0 (16 oktober 2026)

### Wat verandert

- **Module `ai`**, niet meer gereserveerd: Claude doet in de tool een voorstel in een vaste
  structuur, en een mens bevestigt. De prompts staan in `lib/ai/catalogue.ts` (van het project,
  begint leeg), elk met een sleutel, een versie, de volledige instructie, de velden die meegaan en de
  structuur van het antwoord. `runPrompt` is de enige plek die Claude aanroept: recht `ai:use`, de
  prompt aan met een model, de sleutel, de daglimiet per persoon per prompt, structured outputs, en
  het antwoord nog een keer nagekeken. `ProposalView` toont een voorstel altijd met dezelfde
  onderdelen. Onder **Beheer, AI** (recht `admin:ai`) kiest een beheerder per prompt aan of uit, het
  model, het denkniveau en de daglimiet, vult de prijzen per model in, en ziet het verbruik met de
  kosten per verzoek en per maand. Elk verzoek staat in `ai_requests` met tokens en de prijs van dat
  moment, nooit met de inhoud. Geen model, sleutel of bedrag in de code. Beheer, Systeem toont de stand
  zonder de API aan te roepen. Bewijs: `pnpm check:ai` en de tests onder `lib/ai/`; een proef met de
  echte sleutel is `pnpm ai:test -- <model>`. Uitleg in `docs/modules/ai.md`, inrichten in de nieuwe
  handleiding 24; de checklist (00), de startpagina (01) en het overzicht beveiliging en kosten (30)
  noemen hem. De eerste wizard noemt ai niet meer als gereserveerd: het label Dag 2 zegt dat hij er
  dan bij komt met `pnpm template:add ai`.
- **Twee rechten in core**: `admin:ai` en `ai:use`, met hun teksten. Een beheerdersrol krijgt ze
  vanzelf; een andere rol alleen als de matrix van het project ze geeft.
- **`@anthropic-ai/sdk` staat in de afhankelijkheden van core**, net als `nodemailer` en `qrcode`:
  het lockbestand moet kloppen voordat een module is toegepast. Een project zonder module ai laadt het
  pakket nooit.
- **`pnpm doctor`**: klopt deze werkmap? Node en pnpm, git en de commit-hook, het template tegen
  `project.config.json`, `.env.local` met de variabelen van elke toegepaste module, de database
  tegen `SEED_TARGET` en productie, en de koppeling met Vercel. Per regel OK, ACTIE of LATER met wat
  je doet, exitcode 1 bij een actie. Raakt geen database en toont nooit een waarde. Handleiding 07 en
  90 verwijzen ernaar.
- **De wizard voor de tweede trainingsdag**, `wizard/workshop-2.html`, in dezelfde stijl en vanaf de
  voet van de eerste wizard bereikbaar. Vier delen: Vooraf (thuis, met de Claude Console en een
  akkoord over gegevens), Dev en prod (een eigen database voor de laptop, previews met een eigen
  database, `release/next`, migraties en terugzetten, echte gegevens buiten productie), AI ontwerpen
  (toepassing, gegevens, vaste structuur, prompting met een oefening, testgevallen, een rekenhulp voor
  kosten zonder ingebouwde prijzen, en het waterverbruik met bronnen) en AI bouwen (de Playground met
  een scorekaart, een nieuwe functie als route, de AI-functie in de tool, onderhoud). De rooktest loopt
  hem door en bewijst dat wat hij oplevert neutraal is en geen em-dash bevat.
- **Labels "Dag 2" in de eerste wizard**, op de plekken waar de vraag al opkomt, met een link naar de
  stap van dag 2.
- **Inloggen op de wizard**, als drempel en niet als beveiliging: op de site vragen de wizard, de
  wizard van de tweede dag en de feedbackpagina eerst om een account, één per deelnemer, aan of uit.
  De accounts staan als code met een gezouten hash in `wizard/toegang.js` en worden beheerd met
  `node template/ci/wizard-toegang.mjs`; zonder accounts, en vanaf je eigen schijf, is er geen inlog.
  De rooktest bewijst het op een nagebootste site met testaccounts.
- **Terugdraaien in Vercel** (handleiding 90 en WERKWIJZE): Instant Rollback in plaats van Promote,
  met de waarschuwing dat Vercel na een rollback geen nieuwe versie vanzelf live zet tot Undo
  Rollback.
- De wizard toonde code binnen een vetgedrukt stuk met losse backticks; nu staat het er als code.

### Let op bij bijwerken

- **`pnpm install`** na het bijwerken: er is een nieuwe afhankelijkheid (`@anthropic-ai/sdk`).
- **De module ai erbij** gaat met `pnpm template:add ai`, dan `pnpm install` en `pnpm db:migrate`
  op de dev-branch (`pnpm db:roundtrip` voor de terugweg). Geef een rol die geen beheerder is het
  recht `ai:use` in `lib/auth/matrix.ts` als die rol voorstellen mag vragen. Daarna handleiding 24:
  een workspace met uitgavenlimiet in de Claude Console, `ANTHROPIC_API_KEY` in Vercel en in
  `.env.local`, de prijzen en per prompt het model onder Beheer, AI.

## v1.1.0 (15 oktober 2026)

### Wat verandert

- Na de eerste workshop (14 oktober 2026):
  - **De build migreert weer.** `vercel.json` krijgt `buildCommand: "pnpm db:deploy && pnpm build"`
    als standaardwaarde (in `template/lib/apply.ts`). Zonder dat draaide Vercel alleen `next build`,
    en migreerde noch productie noch een preview, terwijl D5 en de handleidingen 03 en 08 dat
    beloofden. Een project met een eigen `buildCommand` houdt het zijne.
  - **Tweestapsverificatie zonder mail.** Moet een beheerder het nog instellen, dan gaat hij na een
    goed wachtwoord in dezelfde stap door naar de pagina met de QR-code; de koppeling per mail is
    niet meer nodig. Zonder ingerichte mail sloot een beheerder zichzelf tot nu toe buiten. Elk nieuw
    instel-token geeft een vers geheim, zodat twee mensen met hetzelfde wachtwoord nooit dezelfde
    QR-code zien. Het geheim staat versleuteld met een sleutel uit de nieuwe variabele
    `MFA_SECRET_KEY` (anders `AUTH_SECRET`); gelijk in Production en Preview werkt tweestap ook op een
    preview. Een geheim onder de oude sleutel wordt bij de volgende inlog omgezet.
  - **Werken via `release/next`**: nieuwe handleiding 09, WERKWIJZE en het core-blok in CLAUDE.md
    stellen elke ronde voor op de vaste releasebranch met een preview en eigen database; direct op
    `main` is de uitzondering.
  - **De startprompt bevat de configuratie en het projectplan**, en Claude zet ze zelf neer. De
    downloads blijven als reserve.
  - **Voorbereiding**: `wizard/voorbereiding.html` (doorklikbaar, met vinkjes) en een controlescript
    voor de laptop (`wizard/controle-laptop.ps1` en `.sh`, met uitleg in `controle-laptop.md` en een
    test in `template/ci/controle-laptop.test.ts`). Handleiding 00 en 01 volgen dezelfde stappen.
  - Handleiding 05b: het eerste beheerdersaccount op productie aanmaken terwijl `.env.local` naar de
    dev-branch wijst. Handleiding 06: Sensitive kan niet voor Development.
  - `template/manifest.json` kent nu de bron (`source`), zodat `pnpm template:update` weet waar het
    template staat.
- Wizard na de workshop:
  - **Feedbackpagina** `wizard/feedback.html`: zet een openbaar issue `[Feedback] ...` klaar in de repo
    van het template, met mailen als alternatief; gelinkt vanaf de voet van de wizard.
  - **Eén ding mee: de startprompt.** Het eindscherm heeft één grote knop "Kopieer de startprompt",
    met een bevestiging en een terugval als het klembord niet mag (de tekst geselecteerd in een
    tekstvak). De persoonlijke checklist zit er nu als derde bestand in; Claude zet hem in
    `docs/handleiding/00-checklist-<slug>.md`. De vier losse downloads staan ingeklapt onder
    "Reserve: losse bestanden".
  - **Alle voorbereiding in de wizard**, één pagina in drie delen met voortgang per deel: A
    Voorbereiden, B Je tool ontwerpen, C Op de dag: live zetten (de acht stappen van de werkdia, met
    per stap wat je doet, hoe je ziet dat het gelukt is en wat je doet als het misgaat). De halve
    pagina uit deel A vult de velden van deel B; stap 3 kreeg daarvoor het veld Gevoelige gegevens,
    dat in kopje 10 van het plan komt. De opslag van deel B blijft `foundation-wizard:v1`; de vinkjes
    en de halve pagina van de oude voorbereidingspagina worden overgenomen.
    `wizard/voorbereiding.html` stuurt door naar `index.html#voorbereiden`.
  - **Schermafbeeldingen** per stap, beschreven in `wizard/schermen.json` en ingebed in de wizard,
    met kaders als HTML bovenop het plaatje; zonder plaatje een kader "Waar je klikt" met het klikpad in tekst.
    Het opnamescript `template/ci/schermen-opnemen.mjs` neemt de openbare pagina's op en, met een
    eigen browserprofiel buiten de repo, de schermen achter een login.
  - **De wizard in de huisstijl van de organisatie** (logo's en lettertypes in `wizard/brand/`).
    `check-template.mjs` staat de merknamen alleen toe in de wizard; de rooktest bewijst dat wat de
    wizard oplevert neutraal blijft.

### Let op bij bijwerken

- Wachtwoordlogin: een nog niet bevestigd tweestapsgeheim vervalt bij een nieuw instel-token. Wie
  halverwege het instellen zat, scant opnieuw.
- `vercel.json` krijgt `buildCommand` als die ontbrak. Staat er in het Vercel-dashboard al een eigen
  Build Command, controleer dan welke van de twee je wilt houden.

### Handwerk

- Projecten die vóór deze versie uit het template zijn gemaakt: zet in `project.config.json` onder
  `template` de regel `"source": "https://github.com/JBandB/bb_foundation_webapp.git"` en draai
  `pnpm template:apply`. Daarna werkt `pnpm template:update`.
- Wachtwoordlogin: zet in Vercel `MFA_SECRET_KEY`, dezelfde waarde in Production en Preview (maak hem
  zoals `AUTH_SECRET`, handleiding 06). Log daarna één keer in op productie; dan zet de tool je
  geheim om.
- Werk je lokaal nog tegen de productiedatabase: maak een dev-branch aan in Neon en zet die in
  `.env.local` (handleiding 04 en 07).

### Getest met

- Next 16.3.6, Node 24, pnpm 11.20.0.

## v1.0.0 (13 oktober 2026)

Uitgebracht zonder tag en zonder `template:release`: het manifest bleef op 0.1.0 staan. Een project
uit deze versie heeft daarom 0.1.0 in `template.lock.json` en werkt in één keer bij naar de
eerstvolgende tag.

### Wat verandert

- Ronde 0: het skelet. Toolchain met vastgepinde versies, huisregels (met drie nieuwe:
  `labels-size`, `no-config-import` en, vanaf ronde 6, `template-ownership`), de contrastcheck op
  `app/theme.css` plus `app/project.css` met de paren in `template/generators/contrast-pairs.json`,
  een neutraal thema in twee modi, de layout met zelf gehoste fonts, en de documentskeletten.
- Ronde 1: het fundament van de tooling. Een schemataal (`template/lib/dsl.ts`) die valideren,
  standaardwaarden en JSON Schema uit één beschrijving haalt; de vorm van `project.config.json`
  (`config-schema.ts`, met afgeleide velden en een geheimenwacht), van `template/manifest.json`
  (`manifest.ts`) en van `template.lock.json` (`lock.ts`); semver, kopregels, placeholders en
  git-wrappers; de vijf patchers voor `package.json`, `vercel.json`, `.env.example`, `CLAUDE.md` en
  `.gitignore`, elk bewezen idempotent; de opdrachten `template:validate` en `template:schema`; drie
  voorbeeldconfiguraties onder `examples/`; en de zelftest `template/self.test.ts`, die bewijst dat
  de wortel van het template precies is wat het manifest en de patchers ervan maken.
- Ronde 2: de kern van de database. Het schema van core (`organisations`, `users` met `external_id`,
  `audit_log`, `user_preferences`, `rate_limits`, `tool_feedback`), de client met luie verbinding,
  `rowsOf`, de foutherkenning op SQLSTATE, de audit log met `systemActor` uit de configuratie en een
  seed voor eigen handelingen (`lib/db/audit-actions.ts`), de schemastand voor Beheer, Systeem, de
  baseline-migraties `0000_core` en `0001_core_guards` (één organisatie, append-only trigger) met hun
  terugweg, de scripts `db:migrate|down|deploy|status|bootstrap|seed|roundtrip` met één migratieloop
  (elke migratie in een eigen transactie), het checkgereedschap `scripts/lib/check.ts` met
  `check:core` en het seed-voorbeeld `check:example`, en `check:migrations` en `check:drift` zonder
  database. De bewijzen tegen een echte database staan op de lijst in `template/README.md`.
- Ronde 3: de inlog en de schil. Auth.js met een JWT van acht uur, inlogmethoden als `LoginProvider`
  (de kern kent geen module bij naam: het gegenereerde register `lib/project/registry.generated.ts`
  levert ze aan, de dev-login komt er lokaal bij), rollen uit `roles.generated.ts` met `parseRoles`,
  rechten in `actions.core.ts` plus de seeds `actions.ts` en `matrix.ts` (een rol zonder regel
  compileert niet), `can()` met test, `currentActor` met actief-check en bij de wachtwoordlogin de
  rollen uit de database, de module auth-entra (provider, profiel, identiteit op `oid`), de teksten
  in twee talen, de UI-kit (panelen, zwevend venster, tabbladen, terugpijl, tabel met sorteren via
  de URL, velden, schuifje, chip, lege staat, skelet), de rail met modus en versie, het merk uit de
  configuratie, het inlogscherm, de foutpagina's, Over de tool uit de drie documenten, de feedbackknop
  met opslag in `tool_feedback`, en de e2e-basis (Playwright, global-setup, helpers, 00 tot 03).
- Ronde 4: Beheer en bewijs. De tabbladen Toegang (gebruikers en de rolmatrix als tabel), Systeem
  (versie, omgeving, schemastand, koppelingen uit `HEALTH_PROVIDERS`) en Feedback; de cronpoort
  `lib/cron/guard.ts` met de dagelijkse opruimcron en `task:prune` (stappen van het project in
  `lib/tasks/prune.project.ts`); `smoke:prod` dat de cronpaden uit `vercel.json` leest; `robots.txt`
  en een seed `security.txt`; e2e 04 en 05; en `check:core` bewijst nu ook dat `listStaff` zonder
  recht weigert.
- Ronde 5: de generatoren. Kleurrekenwerk in OKLCH zonder afhankelijkheden (`colour.ts`), de
  afleiding van een licht en een donker palet uit de acht merkkleuren met een reparatielus op de
  contrastparen (`palette.ts`), en de zeven gegenereerde bestanden: `app/theme.css`,
  `lib/brand/tokens.ts`, `lib/project/config.generated.ts`, `lib/auth/roles.generated.ts`,
  `lib/db/schema/template-index.ts` (uit `schemaFiles` in het manifest) en de twee registers (uit
  `registry` in het manifest). `pnpm template:generate` schrijft ze; de zelftest bewijst dat de
  wortel precies de uitvoer van de generatoren is. Nieuw in het manifest per module: `schemaFiles`
  en `registry`. Nieuw in `PROJECT`: `darkMode`; staat die uit, dan verdwijnt het schuifje en blijft
  alles licht.
- Ronde 6: apply en verify. `pnpm template:apply` past het template toe (`template/lib/apply.ts`):
  owned en generated bestanden worden overschreven als het project ze niet heeft aangeraakt (de
  hash in de lock), anders overgeslagen met een melding; seeds worden één keer neergezet; de vijf
  patchers doen de gedeelde bestanden; de lock wordt geschreven, met een `appliedAt` die alleen
  verandert als er iets anders veranderde. Opties `--dry-run`, `--force` (met een kopie in
  `.template-backup/`), `--strict` (exitcode 1 bij een overgeslagen bestand) en `--allow-dirty`.
  De seeds in de wortel zijn de neutrale versie uit `template/default.project.config.json`; zolang
  een project nog op die standaardconfiguratie staat, blijven ze staan, en bij de eerste apply met
  een echte configuratie worden ze gerenderd als het project ze nog niet had aangeraakt. Verder
  `template:status [--changes]`, `template:verify` (voor CI, nu ook in `ci.yml`),
  `template:adopt <pad> [--remove]` met de kop `template-adopted`, de huisregel
  `template-ownership`, en de gouden test `template/ci/golden.mjs` met `template-ci.yml`: een vers
  project uit de werkkopie per voorbeeldconfig, de batterij zonder database, en een tweede apply
  die niets mag veranderen. De rechtenmatrix `lib/auth/matrix.ts` is nu een seed met placeholder
  (`{{auth.matrix}}`), zodat een project met andere rollen dan admin en member meteen compileert.
  Owned tests nemen niets meer aan over de configuratie (rolnamen uit `APP_ROLES`, datumtekst via
  `PROJECT.locale`), want de gouden test draait ze ook in een project met Engelse interface en
  andere rollen. De e2e voor Beheer kiest de eerste rol zonder beheerrecht uit de configuratie.
- Ronde 7: de module jobs, de eerste opt-in module met een databaseschema. Tabel `jobs` (status
  pending, waiting, done, failed; `system` als tekst; idempotentiesleutel uniek; lease in
  `claimed_until`), `enqueueJob` met `on conflict do nothing` (queued, exists, revived), de ene
  claim-query met `for update skip locked` in `lib/jobs/lease.ts`, `processJobs` met de handlers
  van het project (`lib/jobs/handlers.ts`, een seed), `kickJobs` die de rij via `after()` direct na
  het antwoord verwerkt (op Vercel Hobby mag een cron maar één keer per dag), de cron
  `/api/cron/jobs` als vangnet met opruimen van afgehandeld werk, `pnpm task:jobs`, het tabblad
  Beheer, Achtergrondwerk met "Verwerk wat klaarstaat" en "Mislukte taken opnieuw" (met auditregel),
  de koppeling op Systeem, `pnpm check:jobs` en e2e `06-jobs.spec.ts`. Nieuw in de kern: het
  migratiepad in apply (`template/lib/drizzle.ts`): de migratie van een module wordt in het project
  gegenereerd met `drizzle-kit generate --name=template_<module>_<versie>`, na een driftcontrole en
  met de terugweg uit het manifest; staat de tag al in het journal, dan gebeurt er niets. Zonder
  `node_modules` zegt apply dat je na `pnpm install` nog een keer moet draaien. Verder twee nieuwe
  registers: `adminTabs` (tabbladen onder Beheer, `lib/project/admin-tab.ts`) en `labels` (de
  teksten van een module komen via `lib/i18n/template/modules.generated.ts` onder hun modulenaam in
  `labels`), en `lib/i18n/template/` staat per bestand in het manifest in plaats van als map, zodat
  een module er een bestand bij kan zetten.
- Ronde 8: de module messaging (vereist jobs). Tabellen `outbox` (kanaal mail of Teams, drie
  pogingen, lease) en `notification_settings`; de catalogus van berichtsoorten (`CORE_KINDS` in
  `lib/messaging/kinds.ts` plus `lib/messaging/catalogue.ts` van het project) met per soort het
  kanaal, de doelgroepen (`admins`, `person`, `role:<rol>`) en een drempel; `enqueueKind` als de ene
  manier om iets te melden, langs de instellingen van de beheerder; versturen gebundeld per
  ontvanger als HTML in de merkkleuren; twee transporten achter één contract (`messaging.transport`
  in de configuratie: SMTP met nodemailer, of Microsoft Graph uit een gedeelde postbus) en Teams via
  een webhook; de vastloopmelding `integration_stuck` over wachtrij en outbox; het hulpformulier
  "Lukt inloggen niet?" op het inlogscherm met honingpot en twee grenzen; Beheer, Berichten met de
  soorten, hun instelling in een zwevend paneel, het logboek met filter en opnieuw aanbieden; de
  cron `/api/cron/outbox`; `pnpm task:outbox`, `check:messaging`, `mail:test`, `teams:test`; e2e
  `07-messages.spec.ts`. In de kern: `lib/integrations/http.ts` (fetch met tijdslimiet),
  `claimRows` in `lib/jobs/lease.ts` als de ene lease-query voor elke tabel, en nodemailer als
  afhankelijkheid van de kern, zodat de lockfile hem kent en apply geen install vraagt.
- Ronde 9: de module auth-password (vereist messaging, gaat niet samen met auth-entra). Tabellen
  `credentials` (scrypt-hash met eigen zout, versleuteld TOTP-geheim, vergrendeling) en
  `auth_tokens` (eenmalige koppelingen: uitnodiging zeven dagen, herstel een uur, tweestapsverificatie
  instellen een kwartier; alleen de sha256 in de database). De Credentials-provider met één
  foutmelding voor onbekend, fout en vergrendeld, en twee aparte uitkomsten (code nodig, eerst
  tweestapsverificatie instellen via een koppeling per mail); rollen uit `users.roles`
  (`rolesFrom: "database"`). Schermen: het inlogformulier met het codeveld dat verschijnt als het
  nodig is, wachtwoord vergeten en herstellen, de uitnodiging aannemen, tweestapsverificatie
  instellen (QR als SVG via qrcode), Mijn account (wachtwoord wijzigen, 2FA aan of uit) via het nieuwe
  register `navItems`, en Beheer, Accounts (uitnodigen, rollen, deactiveren, 2FA resetten,
  herstelkoppeling) naast de leeslijst Toegang van de kern. `pnpm invite` maakt de eerste beheerder
  met een koppeling op het scherm, `pnpm check:auth-password` bewijst de sloten, e2e
  `09-password.spec.ts` de hele weg. Nieuw in `PROJECT`: `password.mfaRequiredFor`; nieuw in
  messaging: de soort `mfa_setup`; nieuw in de kern: het register `navItems` en qrcode als
  afhankelijkheid. Een labelregistratie kan met `as` een eigen sleutel kiezen (`labels.password`).
- Ronde 10: de module files. Tabel `files` (doel, entiteit, blobpad, naam, type, grootte, wie,
  zacht verwijderen), de blob-client zonder SDK (`lib/files/blob.ts`: PUT en GET met een SAS-token
  dat op de server blijft, de inhoud nagekeken op grens, type en eerste bytes, macro's geweigerd),
  de doelen van het project als seed (`lib/files/purposes.ts`, standaard `documents` met 4 MB), de
  rij-niveau-controle van het project als seed (`lib/files/authorize.project.ts`), `uploadFile`,
  `fileById`, `listFiles` en `removeFile` in `lib/files/store.ts` achter `files:read` en
  `files:write`, de downloadroute `/api/files/[id]` (401 zonder sessie, 404 voor wat niet bestaat of
  niet mag, als bijlage met `nosniff`), `FileInput` voor formulieren van het project, de koppeling op
  Systeem met de vervaldatum van het token (`BLOB_SAS_EXPIRES`), `pnpm blob:status` (een pixel erin
  en eruit), `pnpm check:files`, e2e `08-files.spec.ts`.
- Ronde 11: bijwerken en uitbrengen. `pnpm template:update [--to X.Y.Z] [--from <map>]` haalt een
  versietag van `template.source` op (of een map), start **de tooling uit die nieuwe versie** met dit
  project als werkmap (`apply --source`), en toont daarna de secties uit `template/CHANGELOG.md`
  tussen oud en nieuw. `pnpm template:add <module>` zet een module met wat ze vereist in
  project.config.json en past toe. `pnpm template:release X.Y.Z` (alleen in de templaterepo) zet de
  versie in het manifest omhoog, sluit "Nog niet uitgebracht" af als die versie en werkt de lock
  bij; de tag zet de mens. `template:status` doet een versiecheck tegen `template.source`
  (`--offline` slaat hem over). De updatetest `template/ci/update-test.mjs` (in `template-ci.yml`)
  bewijst zonder git-tags en zonder database: een owned bestand komt mee, een door het project
  gewijzigd owned bestand blijft staan en wordt gemeld, de lock en de tooling van het project krijgen
  de nieuwe versie, verify wijst het gewijzigde bestand aan, adopt lost het op, en een tweede update
  verandert niets.
- Ronde 12: de documenten voor Claude en voor de mens. `docs/THEME.md` (de themagids, generiek),
  `docs/WERKWIJZE.md` (het samenspel per ronde), `docs/modules/` (per module wat erin zit, wat het
  project levert, de variabelen en het bewijs, plus de gereserveerde modules), `docs/patronen/`
  (twintig patronen met een codevoorbeeld zonder domeinnamen) en `docs/lessen/` (79 lessen in negen
  lagen, elk met een vast anker zoals `L-DRZ-01`, symptoom, oorzaak, regel en afgedwongen door; de
  triggertabel in het CLAUDE-blok wijst ernaar). Drie stukken kern die de lessen noemen en die er
  nog niet waren: `lib/monitoring/report.ts` (`scrubMessage`, `describeError`, `reportError`: een
  serverfout verlaat de tool nooit met parameters, sleutelwaarden, mailadressen of tokens erin) met
  `instrumentation.ts` dat `onRequestError` van Next eraan hangt, en `lib/domain/csv-safe.ts` (BOM,
  puntkomma, CRLF, formules geneutraliseerd, scheidingsteken raden), allebei met tests. De
  hygiëneregel `template/ci/check-template.mjs` grept het template op de woorden in
  `template/ci/forbidden-words.txt` en op em-dashes, in `template-ci.yml`.
- Ronde 13: de handleidingen en de wizard. `docs/handleiding/` 01 tot 90 volgens één stramien
  (nodig, wat je aanmaakt, stappen met controle, waarom, beveiliging, kosten zonder bedragen, zo zie
  je dat het goed staat, als het misgaat, vul in), het stramien van de checklist (00), handleiding 10
  over het projectplan met een slecht en een goed voorbeeld per kopje, de seed `docs/PROJECTPLAN.md`
  met twaalf kopjes, `pnpm entra:status` voor de Microsoft-login, en `wizard/index.html`: één
  HTML-bestand zonder server dat `project.config.json`, het projectplan, de persoonlijke checklist en
  de startprompt oplevert (acht stappen, antwoorden in `localStorage` onder `foundation-wizard:v1`,
  een geheimenwacht met dezelfde vormen als `template/lib/config.ts`, een contrastvoorstel per
  kleurpaar). De kop van een HTML-bestand staat op regel 2, na de doctype; `template/lib/header.ts`
  en de huisregel kennen die plek. De rooktest `template/ci/wizard-smoke.mjs` opent de wizard vanaf
  `file://` in Chromium, vult de kinderboerderij-casus in, leest de vier downloads en haalt de
  configuratie door `template:validate` (42 controles); `template-ci.yml` draait hem in een eigen
  job. De SPEC-seed brengt nu de twaalf besluiten D1 tot en met D12 mee die het template oplegt
  (inlogmodule, één organisatie, Neon, Vercel, twee modi, versie per PR, git doet de mens, modules,
  UI-taal, kostenplafonds, GitHub zonder branch protection), elk met de prijs erbij; de startprompt
  van de wizard laat projectbesluiten bij D13 beginnen.

### Let op bij bijwerken

- Nog niets: er is geen eerdere versie.

### Handwerk

- Geen.

### Getest met

- Next 16.3.6, Node 24, pnpm 11.20.0.
