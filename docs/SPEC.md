# Specificatie: Webapp

Versie 0.1, 2 oktober 2026. Dit document groeit uit het projectplan (`docs/PROJECTPLAN.md`); de
eerste ronde van Claude vult hoofdstuk 1, 2, 5, 6, 7 en 10 en legt de eerste eigen besluiten vast.

### Wijzigingen in dit document

| # | Wat | Waar |
|---|---|---|
| S1 | Skelet aangemaakt uit het template | overal |

## 1. Doel en context

[nog in te vullen uit PROJECTPLAN 1, 2 en 3]

## 2. Non-goals

| Niet bouwen | Wanneer wel |
|---|---|
| [nog in te vullen uit PROJECTPLAN 8] | |

## 3. Besluitenlog

Elk besluit krijgt een nummer dat nooit verandert, een datum, en de prijs erbij: wat het kost of wat
het onmogelijk maakt. Een besluit omkeren gebeurt met een nieuw besluit dat naar het oude verwijst,
nooit door het oude te wijzigen. "Over de tool" toont deze tabel in de applicatie.

### 3.1 Het lopende besluitenlog, begonnen op 2 oktober 2026

| # | Besluit | Waarom, en wat het kost |
|---|---|---|
| D1 | **Dit project is gemaakt uit het template BB_foundation_webapp.** Bestanden met de kop `template-owned` zijn van het template en worden alleen via `pnpm template:update` gewijzigd; de rest is van het project. | Eén bron voor de werkwijze en de lessen van eerdere projecten, en updates zonder opnieuw te beginnen. De prijs: eigen aanpassingen in een template-owned bestand gaan bij een update verloren, tenzij je het bestand met `pnpm template:adopt` van het project maakt. |
| D2 | **Eén inlogmodule per project, gekozen bij het aanmaken** (`auth.provider` in `project.config.json`). Met een Microsoft 365-tenant is dat `auth-entra`: rollen komen uit het token en worden in Entra toegekend. Zonder tenant is het `auth-password`: eigen accounts, uitgenodigd door een beheerder, met tweestapsverificatie en vergrendeling. | Twee deuren tegelijk zijn twee keer de aanvalsvlakte en twee keer het beheer. De prijs: wisselen is later een migratie van identiteiten, dus kies nu goed. |
| D3 | **Eén organisatie per database.** `organisation_id` staat op elke tabel en een unieke index staat precies één rij in `organisations` toe. | Elke query draagt de organisatie mee, dus een tweede organisatie is later geen herbouw maar een nieuw besluit over autorisatie en isolatie. De prijs: tot dat besluit is er geen multi-tenant. |
| D4 | **Neon in Frankfurt, met een dev-branch per ontwikkelaar en een wegwerpbranch per pull request.** Geen lokale Postgres. | Een lokale database mist extensies en wijkt in versie af, zodat een constraint pas in productie afgaat. De prijs: werken zonder internet kan niet, en een slapende compute kost bij het eerste verzoek een paar seconden. |
| D5 | **Vercel in dezelfde regio als de database, previews alleen uit een pull request, en de build migreert zelf** (`pnpm db:deploy` vóór `next build`, met een guard op het productie-endpoint). | Een preview zonder pull request heeft geen eigen database en zou op productie uitkomen; de guard weigert dan. De prijs: een "Redeploy" vanuit de console op een andere branch dan `main` faalt met opzet. |
| D6 | **Twee modi, licht en donker, allebei uit de tokens in `app/theme.css`,** en elke tint door `pnpm check:contrast`. | Een scherm dat in één modus klopt is half af, en contrast narekenen is goedkoper dan het later terugvinden. De prijs: elk nieuw scherm in beide modi bekijken. |
| D7 | **De versie staat in beeld en elke pull request hoogt hem op,** met een regel in `RELEASE-NOTES.md` en een in `RELEASE-NOTES-KORT.md`. | Zonder zichtbare versie is "werkt het al?" niet te beantwoorden. De prijs: een pull request zonder versie en notes is niet klaar. |
| D8 | **Git doet de mens.** Claude Code commit, pusht en brancht niet. | Wie merget moet weten wat er verandert, en dat lees je bij het committen. De prijs: elke ronde eindigt met een paar minuten handwerk. |
| D9 | **Modules worden bij het aanmaken gekozen en later alleen toegevoegd** (`pnpm template:add`); verwijderen is handwerk met een besluit erbij. | Een module brengt tabellen en migraties mee die data kunnen dragen. De prijs: een module die er eenmaal is, blijft, en haar tabellen ook. |
| D10 | **De taal van de interface is één keuze per project** (`uiLanguage`), de documentatie is Nederlands en code is Engels. | Eén taal in de interface houdt de teksten op één plek en de tests eenduidig. De prijs: een tweede taal later betekent elke tekst twee keer en een test die vergeten vertalingen vindt (patroon `tweede-ui-taal`). |
| D11 | **Elke dienst heeft een uitgavenplafond, zo laag mogelijk en hard waar dat kan.** Het budget en de plek van elk plafond staan in de checklist en in kopje 10 van het projectplan. | Een plafond dat bereikt wordt zet een dienst stil, en dat is beter dan een rekening die niemand verwachtte. De prijs: een maandelijkse blik op de kosten, en een keer een tool die stilstaat tot iemand het plafond verhoogt. |
| D12 | **GitHub op het gratis plan, zonder branch protection; de CI is advies.** Werken via pull requests is afspraak. | Branch protection op een privé-repo vraagt GitHub Team, en dat is in de startfase niet nodig als iedereen via een pull request werkt. De prijs: niets houdt een push naar `main` technisch tegen; wie dat slot wil, betaalt voor Team en zet het aan. |
| D13 | **De app verbindt op productie als een eigen rol zonder DDL, en elke tabel draagt Row Level Security met één regel die die rol alle rijen geeft.** De rol `app_rw` komt uit de migraties, de inlogrol per omgeving is handwerk (handleiding 04) en lokaal `pnpm db:app-login`; `appRowAccess()` staat op elke tabel en `pnpm check:grants` bewijst slot, regel en rechten. Geen filter per organisatie: wie wat mag, regelt de app. | Een gelekte verbinding, een injectie of een Data API die iemand aanzet kan dan geen tabel weggooien, de audit log niet wijzigen en zonder de rol van de app geen rij zien. In een eerder project zette een aangezette Data API het slot zonder regel en viel het inloggen om toen de rol van de app kwam; met de regel op elke tabel kan dat niet meer. De prijs: één regel per tabel, een test die hem eist, op productie een inlogrol en een variabele met de hand, en lokaal `db:app-login` na elke `vercel env pull`. |
| D14 | **De Content-Security-Policy draagt een nonce per verzoek** (`proxy.ts`, `lib/security/csp.ts`): `script-src 'self' 'nonce-...' 'strict-dynamic'` zonder `'unsafe-inline'`, de vaste CSP uit de configuratie is weg, de andere headers blijven daar. `style-src` houdt `'unsafe-inline'`. | Een script dat niet van ons is, draait niet, ook niet als er ergens HTML ontsnapt; de vaste CSP met `'unsafe-inline'` droeg XSS niet. De prijs: elke pagina wordt dynamisch gerenderd, een eigen `<script>` heeft de nonce nodig (`x-nonce`), en na de eerste uitrol één ronde door elk scherm met de console open; de e2e `05b` bewaakt het daarna. |
| D15 | **Een cronroute met meer dan één ronde draait zijn rondes als losse stappen** (`runSteps` en `stepsResponse`, `lib/cron/steps.ts`): een stap die gooit, wordt gemeld met zijn naam, de volgende loopt door, en het antwoord is een 500 met de mislukte stappen erin. Het opruimen (`runPrune`) en de crons van de modules jobs en messaging lopen erop. | In een eerder project zette één fout in de tweede ronde van een nachtelijke route dagenlang de zes rondes erna stil, en niemand miste een melding die niet kwam. De prijs: alleen voor stappen die niets van elkaar nodig hebben; het antwoord van een cronroute heeft de vorm `results` en `failed`; en een cron die voor een deel lukt, staat bij de host als mislukt, want opvangen is niet verzwijgen. 17 november 2026. |
| D16 | **Een foutmelding draagt de oorzaak als labels, en nooit de rij** (`causeTags`, `lib/monitoring/report.ts`): de code, en bij een databasefout de naam van de check of index, de tabel en de kolom, uit de keten van `cause`. | De melding van Drizzle zegt wat er misging en niet waarom; zonder de naam van de check kostte een fout in een eerder project een onderzoek, en het bleef een vermoeden. De prijs: de grens ligt in twee patronen die streng moeten blijven (een code, of een naam uit het schema); `message` en `detail` van de oorzaak gaan nooit mee, want daar zet Postgres de inhoud van de rij in. 17 november 2026. |
| D17 | **Een pagina met een punt in het adres is een pagina, en HTML buiten de proxy krijgt een vaste CSP.** De proxy slaat alleen `/api`, de bestanden van Next en een pad dat op de extensie van een bestand eindigt over (`STATIC_FILE_EXTENSIONS`); de eigen pagina's van Auth.js onder `/api/auth` krijgen `STATIC_CSP`, zonder scripts, uit `lib/config/next-base.ts`. Vult D14 aan. | In een eerder project viel de CSP weg op elk adres met een punt erin en op de twee HTML-pagina's van de inlogbibliotheek. De prijs: de lijst met extensies staat twee keer (in `lib/security/csp.ts` en letterlijk in de matcher van `proxy.ts`, want Next volgt daar geen variabele; `csp-coverage.test.ts` houdt ze gelijk), en een pagina waarvan het adres op zo'n extensie eindigt, valt nog steeds buiten de proxy. 17 november 2026. |
| D18 | **Met inloggen via Microsoft start een deploy niet zonder de uitgever van de eigen tenant** (`entraIssuerProblem`, `lib/auth/providers/entra-issuer.ts`): zonder `AUTH_MICROSOFT_ENTRA_ID_ISSUER` in een preview of in productie, of met `common`, `organizations` of `consumers` erin, gooit de provider bij het opstarten en faalt de build bij de host. | Zonder uitgever valt de provider terug op `/common/` en mag ieder Microsoft-account het proberen; of er dan iemand binnenkomt, hangt aan een instelling in een console die niemand bewaakt. De prijs: een vergeten variabele is een mislukte deploy in plaats van een werkende; de build in de CI en de e2e met de dev-login draaien zonder Entra en blijven werken, dus daar toetst niets de uitgever. 17 november 2026. |
| D19 | **De CI draait ook op `release/next`, weigert GPL en AGPL in wat naar productie gaat, en leest de hele git-historie op geheimen.** `pnpm check:licenses` is een poort (LGPL mag, een onbekende licentie waarschuwt); Gitleaks staat op een vaste versie met checksum en is advies tot een run beoordeeld is, met de valse bevindingen en hun reden in `.gitleaks.toml`. Semgrep blijft advies. Vult D12 aan. | Een directe push naar de releasebranch liep in een eerder project buiten de scans om; een afhankelijkheid kan stil van licentie wisselen; en een geheim dat is weggehaald, staat nog in de historie. De prijs: een run meer per push, een nieuwe afhankelijkheid onder GPL houdt een pull request tegen tot er een besluit ligt, en twee scans staan op advies tot iemand hun eerste uitkomst heeft nagelopen. 17 november 2026. |
| D20 | **Alleen `main` en `release/next` rollen uit; een werkbranch krijgt geen eigen preview** (`git.deploymentEnabled` in `vercel.json`, de soorten uit de werkwijze op `false`, zonder een regel die alles uitzet). De Ignored Build Step blijft het tweede slot. Vult D5 aan. | Elke branch een preview met een eigen databasebranch liep in een eerder project tegen de limiet van het aantal branches aan, en de previews faalden binnen een seconde. De prijs: wie een werkbranch wil bekijken, zet hem op `release/next` of opent hem lokaal; en een nieuwe soort branch die niet op de lijst staat, rolt wel uit. 17 november 2026. |
| D21 | **De deploy zet na de migraties de basisgegevens neer** (`pnpm db:deploy` roept `ensureBaseData` aan, hetzelfde als `pnpm db:bootstrap`): de organisatie uit de configuratie en de referentiegegevens van het project, op elke omgeving. Vult D5 aan. | Geen migratie maakt de organisatierij en geen handleiding liet het script op productie draaien, dus op een verse productiedatabase faalden de eerste inlog en de eerste uitnodiging. De prijs: de referentiegegevens uit `scripts/lib/bootstrap.project.ts` lopen bij elke deploy opnieuw en moeten dus echt idempotent zijn (alleen upserts); een fout daarin laat de build falen. Nog niet tegen een database bewezen. 17 november 2026. |

## 4. Stack en conventies

Next.js (App Router) met TypeScript, Neon Postgres via Drizzle, Auth.js, Tailwind, deploy op
Vercel. De vaste regels staan in `CLAUDE.md`; de lessen die eraan ten grondslag liggen in
`docs/lessen/`.

## 5. Datamodel

[nog in te vullen uit PROJECTPLAN 4]

## 6. Autorisatiemodel

[nog in te vullen uit PROJECTPLAN 3: rollen, wat waarachter zit, en de drie lagen van handhaving:
de rail filtert, de pagina assert, de leesfunctie assert]

## 7. Kernflows

[nog in te vullen uit PROJECTPLAN 5]

## 8. Rekenregels

[alleen als het project rekent]

## 9. Koppelingen

[nog in te vullen uit PROJECTPLAN 7]

## 10. Fasen en exitcriteria

[nog in te vullen uit PROJECTPLAN 9]

## 11. Front-end en huisstijl

Zie `docs/THEME.md`. De kleuren komen uit `project.config.json`.

## 12. Backup, retentie en privacy

[nog in te vullen uit PROJECTPLAN 10]

## 13. Openstaande punten

| # | Vraag | Wie beantwoordt | Blokkeert |
|---|---|---|---|
| V1 | [nog in te vullen uit PROJECTPLAN 11] | | |
