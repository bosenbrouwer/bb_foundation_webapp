<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Het template, voor wie eraan bouwt

Dit is `BB_foundation_webapp`: een generiek projecttemplate voor webapplicaties op Next.js, Neon
Postgres (Drizzle), Auth.js, Tailwind en Vercel, gedestilleerd uit het project flightplan van
Bos & Brouwer. Het plan en de besluiten van 2 oktober 2026 staan in de planmap van Claude; dit
bestand is de samenvatting die in de repo blijft.

## Wat het is

- **De root is een werkend project.** Met `project.config.json` als neutrale standaard, de modules
  `core` en `auth-entra` toegepast, en een CI die groen is. "Use this template" op GitHub geeft dus
  direct iets dat bouwt. Daarna zet Claude, op aanwijzing van de startprompt (uit een wizard, of die uit
  handleiding 10), de config en het projectplan over de standaard en draait `pnpm template:apply`.
- **De input van een project is een projectplan** (`docs/PROJECTPLAN.md`). Het template bevat
  geen regel projectinhoud; de template-CI grept daarop.
- **Twee lezers.** Claude Code bouwt (CLAUDE.md, `docs/lessen/`, `docs/patronen/`), de mens stuurt
  en doet het handwerk buiten de code (`docs/handleiding/`, `docs/WERKWIJZE.md`).

## Eigendom per bestand

| Klasse | Betekenis | Herkenbaar aan |
|---|---|---|
| owned | van het template; `pnpm template:update` overschrijft | kop `template-owned (module x)` op regel 1 |
| generated | owned, maar berekend uit `project.config.json` | kop `template-generated (naam)` |
| seed | één keer aangemaakt, daarna van het project | geen kop; staat in `template.lock.json` als seed |
| merge | gedeeld bestand met beheerde blokken | `package.json`, `vercel.json`, `.env.example`, `.gitignore`, `CLAUDE.md` |

Een owned bestand toch veranderen: `pnpm template:adopt <pad>` maakt het van het project, met de kop
`template-adopted`. JSON is nooit owned, want een JSON-bestand kan geen kop dragen (`tsconfig.json`
is JSONC en de uitzondering).

Seeds met `{{placeholders}}` staan onder `template/modules/<module>/seed/`, ook als het code is
zoals `lib/auth/matrix.ts`: `tsconfig.json` en ESLint slaan `template/modules/` over, dus een
placeholder in een `.ts`-bron stoort niets. De wortel van het template bevat elke seed in de neutrale versie,
gerenderd met `template/default.project.config.json` op de datum `rootRenderedOn` uit het manifest;
de zelftest bewijst dat. Zolang een project op die standaardconfiguratie staat, laat apply de seeds
staan. Bij de eerste apply met een echte configuratie rendert hij ze opnieuw, maar alleen als het
project ze nog niet had aangeraakt.

## Modules

`core` (altijd), `auth-entra`, `auth-password`, `jobs`, `messaging` (vereist jobs), `files`, `ai`.
Gereserveerd en leeg: `monitoring-sentry`, `portal`, `access-graph`. De bronbestanden van een
opt-in module staan onder `template/modules/<naam>/files/`; ze landen pas bij apply in de
projectboom, en daarom sluit `tsconfig.json` die map uit.

## Commando's in een project

| Opdracht | Doet |
|---|---|
| `template:apply [--dry-run] [--force] [--strict] [--allow-dirty]` | past het template toe: generatoren, owned en seed bestanden per module, de gedeelde bestanden via de patchers, de lock, en een slottekst met wat de mens nu doet. Een owned bestand dat het project heeft gewijzigd wordt overgeslagen; `--force` overschrijft met een kopie in `.template-backup/`; `--strict` geeft exitcode 1 bij een overgeslagen bestand (voor CI); zonder `--allow-dirty` weigert apply op een werkmap met niet-gecommitte wijzigingen |
| `template:status [--changes]` | de stand: versie, modules, bestanden ongewijzigd, gewijzigd, ontbreekt, overgenomen, seeds met een nieuwere opzet |
| `template:verify` | voor CI: de lock klopt, geen owned bestand gewijzigd, de gegenereerde bestanden actueel, de gedeelde bestanden een vast punt van hun patcher, elke kop juist |
| `template:adopt <pad> [--remove]` | maakt een owned bestand blijvend van het project, of verwijdert het bewust |
| `template:generate` | schrijft alleen de gegenereerde bestanden opnieuw |
| `template:validate [pad]`, `template:schema` | controleert een configuratie; schrijft het JSON Schema (alleen in de templaterepo) |
| `template:update [--to X.Y.Z] [--from <map>]` | haalt de nieuwste versietag van `template.source` op (of de map), laat de tooling uit die versie apply draaien op dit project, en toont wat er tussen oud en nieuw veranderde. Neemt de opties van apply over |
| `template:add <module>` | zet de module en wat ze vereist in project.config.json en past toe |
| `template:release X.Y.Z` | alleen in de templaterepo: versie omhoog, CHANGELOG afsluiten, lock bijwerken; de tag en de commit doet de mens |

Apply raakt nooit een database. De migratie van een module met een schema wordt in het project
gegenereerd (`template/lib/drizzle.ts`): eerst een driftcontrole, dan `drizzle-kit generate
--name=template_<module>_<versie>` met de terugweg uit het manifest ernaast. Dat vraagt
`node_modules`; bij een verse kloon zegt apply dat je na `pnpm install` nog een keer draait. Een
opt-in module kan zo zelf nooit een migratie meeleveren: de snapshot en het tijdstempel zijn van het
project. Alle scripts roepen `node` rechtstreeks
aan, nooit genest `pnpm`: een `&` in een Windows-gebruikerspad breekt dat, ook de globale
`pnpm.cmd`-shim zelf; daarom start `template/ci/golden.mjs` pnpm via zijn JavaScript-startpunt.

## Regels voor wie aan het template werkt

1. Geen projectinhoud, geen namen van eerdere projecten, van de organisatie of van klanten, geen
   em-dash. `node template/ci/check-template.mjs` grept erop, en `template-ci.yml` draait het bij
   elke push naar `main` en `release/next` en bij elke pull request. De woorden staan in
   `template/ci/forbidden-words.txt`. Wat de check overslaat, staat bovenin het script en is dit:
   drie bestanden (dit bestand, `forbidden-words.txt` en `check-template.mjs` zelf), de mappen
   `node_modules`, `.next`, `.git`, `.vercel`, `.template-backup`, `coverage`, `playwright-report`,
   `test-results` en `fonts`, en elk bestand zonder tekstextensie dat niet met een punt begint
   (afbeeldingen, fonts). De wizard en het lesmateriaal van een training staan sinds v1.3.0 in een
   eigen repo, en die test zelf dat wat de wizard oplevert neutraal blijft en door
   `template:validate` komt.
2. Documentatie Nederlands, code Engels, UI-teksten in `lib/i18n/template/` in beide talen.
3. Elke owned bestand draagt de kop. Elke wijziging aan een owned bestand komt in
   `template/CHANGELOG.md` onder de volgende versie, met "Let op bij bijwerken" als er iets kan
   botsen en "Handwerk" als een project daarna iets met de hand moet doen. Na de wijziging draai je
   `pnpm template:apply`, want de wortel is zelf een toegepast project en `template.lock.json` moet
   de nieuwe hash kennen; `template:verify` in de CI faalt anders.
3b. Een owned test mag niets aannemen over de configuratie: geen letterlijke rolnamen (gebruik
   `APP_ROLES` en `ADMIN_ROLES`), geen Nederlandse datumtekst zonder `PROJECT.locale`, geen
   modulenaam die een project kan missen. De gouden test draait elke owned test ook in een project
   met Engelse interface, andere rollen en de wachtwoordlogin.
4. Nooit een kolom hernoemen tussen schemaversies van een module; uitbreiden en inkrimpen in
   stappen. Een nieuwe enumwaarde en het gebruik ervan in twee schemaversies.
4b. Een module krijgt een nieuwe schemaversie zo: het schemabestand aanpassen, `schemaVersion` in het
   manifest verhogen, en `template/modules/<module>/migrations/<versie>/down.sql` erbij met alleen
   wat die versie toevoegde. De terugweg van een eerdere versie wijzig je niet. `template:apply`
   maakt in een bestaand project een eigen migratie met die terugweg; in een vers project zit het
   hele schema in de eerste migratie en gaat de terugweg van elke latere versie daar voorop
   (`template/lib/drizzle.ts`). Bewijs allebei: de gouden test met `voorbeeld` voor het verse
   project, en een `template:update --from` van een project op de vorige versie voor het bestaande.
5. Een ronde is klaar als de batterij groen is: typecheck, lint plus huisregels, vitest,
   check:secrets, check:licenses, check:migrations, check:drift, check:contrast, template:verify,
   build, de migraties heen en terug op de dev-branch, alle `check:<domein>`, en de e2e tegen
   `next start`. `pnpm check:all` draait alles in die volgorde (`scripts/lib/battery.ts`) en zegt wat
   het oversloeg; de samenvatting komt in de rubriek Bewijs. Voor het template zelf komen daar
   `node template/ci/check-template.mjs` en de gouden test bij (`template/ci/golden.mjs`).

## Stand

| Ronde | Inhoud | Stand |
|---|---|---|
| 0 | Skelet en toolchain | klaar, 2 oktober 2026 |
| 1 | Manifest, lock, config-DSL, patchers | klaar, 2 oktober 2026 |
| 2 | DB-kern en migraties | code klaar, 2 oktober 2026; bewijs tegen de database uitgesteld |
| 3 | Auth en app-schil | code klaar, 2 oktober 2026; e2e uitgesteld |
| 4 | Beheer core en bewijs | code klaar, 2 oktober 2026; e2e en check:core uitgesteld |
| 5 | Generatoren | klaar, 2 oktober 2026 |
| 6 | Apply en verify | klaar, 2 oktober 2026; gouden test groen voor default, voorbeeld en minimaal |
| 7 | jobs | code klaar, 2 oktober 2026; gouden test met jobs groen (migratie gegenereerd in het project); check:jobs en e2e 06 uitgesteld |
| 8 | messaging | code klaar, 2 oktober 2026; gouden test met jobs en messaging groen (twee losse migraties); check:messaging, e2e 07 en de proefmail uitgesteld |
| 9 | auth-password | code klaar, 3 oktober 2026; check:auth-password en e2e 09 uitgesteld |
| 10 | files | code klaar, 3 oktober 2026; check:files, blob:status en e2e 08 uitgesteld |
| 11 | Update en release | code klaar, 3 oktober 2026; updatetest offline |
| 12 | Documenten voor Claude | klaar, 3 oktober 2026: THEME, WERKWIJZE, docs/modules, de patronen en de lessen, check:template. Stand na v1.8.0: 29 patronen, en 121 lessen in tien lagen (de laag `ai` is nieuw). De startprompt op een vers project is nog niet beproefd (ronde 14) |
| 13 | Handleidingen en wizard | code klaar, 3 oktober 2026: handleidingen 00 tot 90 en de PROJECTPLAN-seed. De wizard en zijn rooktest staan sinds v1.3.0 in een eigen repo; `template/ci/wizard-smoke.mjs` bestaat hier niet meer. De klikproef door een collega staat open |
| 14 | Proef op de som, v1.0.0 | v1.0.0 staat in `template/CHANGELOG.md` (13 oktober 2026); de proef met een database staat nog open, zie hieronder |

Deze tabel beschrijft de bouw tot en met v1.0.0. Wat er sindsdien per versie veranderde, staat in
`template/CHANGELOG.md`; de versie van nu staat in `template/manifest.json`.

## Uitgestelde bewijzen

Bewijzen die een Neon-dev-branch nodig hebben en nog niet zijn gedraaid, omdat die er tijdens de bouw
niet was. Allemaal inhalen zodra `.env.local` van de templatemap een dev-branch kent, in deze volgorde:

| Ronde | Bewijs | Opdracht |
|---|---|---|
| 2 | migratie heen, twee keer terug, heen | `pnpm db:roundtrip` (met `SEED_TARGET`) |
| 2 | bootstrap en seed idempotent | `pnpm db:bootstrap` twee keer, `pnpm db:seed` twee keer, `pnpm db:status` |
| 2 en 4 | de sloten van de kern en de rechten in de leesfunctie | `pnpm check:core` en `pnpm check:example` |
| 3 en 4 | de e2e-basisset 00 tot 05: inloggen, inlogscherm, Over de tool, modus, cron, Beheer | `pnpm db:seed`, `pnpm e2e:all` |
| 4 | de rooktest tegen de gebouwde server | `pnpm build`, `pnpm start --port 3100` en `pnpm smoke:prod -- --url=http://localhost:3100` |
| 7 | de sloten van de wachtrij en het scherm, in een project met jobs (bijvoorbeeld de gouden kopie van `voorbeeld` met `--keep`) | `pnpm db:roundtrip` (de gegenereerde migratie heen en terug), `pnpm check:jobs`, e2e `06-jobs.spec.ts` |
| 8 | de sloten van de outbox en de instellingen, het scherm en het hulpformulier, en één echte mail | `pnpm check:messaging`, e2e `07-messages.spec.ts`, `pnpm mail:test -- <adres>` met een ingericht transport |
| 9 | tokens, vergrendeling, uitnodigen en aannemen, tweestapsverificatie met een echte code; de hele weg door de browser | `pnpm check:auth-password` (met `AUTH_SECRET` in `.env.local`), e2e `09-password.spec.ts` in een project met de wachtwoordlogin |
| 10 | de administratie en de sloten van bestanden, de route zonder sessie, en één echte blob | `pnpm check:files`, e2e `08-files.spec.ts`, `pnpm blob:status` met een ingerichte container |
| 14 | de proef op de som met database: in de gouden kopieën van `default` (Entra) en `voorbeeld` (wachtwoord, alle modules) `pnpm db:roundtrip`, `pnpm db:bootstrap`, `pnpm db:seed`, alle `check:*` en de volledige e2e; daarna een update met een gewijzigde seed en een gewijzigd owned bestand tegen een echte tag | `node template/ci/golden.mjs --keep voorbeeld`, dan in die map met een `.env.local` naar een dev-branch; de offline helft (gouden test, updatetest) draait al in `template-ci.yml` |
| v1.6.0 | de rol van de app en het slot op elke tabel: de inlogrol op de dev-branch, de rechten, de regel, evenveel rijen als de eigenaar, en de app en de e2e als die rol | `pnpm db:app-login`, `pnpm check:grants`, daarna `pnpm dev` en `pnpm e2e:all` met `DATABASE_URL_APP` in `.env.local` |
| v1.7.0 en v1.8.0 | de CSP in een echte browser: één header, de nonce op elk script in de HTML van de server, een pagina met een punt in het adres, en de vaste CSP op `/api/auth` | e2e `05b-csp.spec.ts` |
| v1.2.0 en v1.8.0 | de sloten van de module ai, en in rubriek 7 de smokkeltest tegen de database | `pnpm check:ai` in een project met de module ai, met minstens één geval in `scripts/check-ai.project.ts` |
| v1.8.0 | de cronroutes op `runSteps`: het antwoord `{ results, failed }` van de kern, de wachtrij en de outbox. De mislukte stap en de 500 bewijst `lib/cron/steps.test.ts` zonder database | e2e `04-cron.spec.ts`, en in een project met jobs en messaging `06-jobs.spec.ts` en `07-messages.spec.ts` |
| v1.9.0 | de noodstop en het maandplafond van de module ai: de sloten en de toets dwars door `runPrompt`; de migratie `template_ai_2` heen en terug in een bestaand project, de samengevoegde terugweg in een vers project, en de rechten van de rol van de app op `ai_limits` | `pnpm check:ai` (rubriek 8), `pnpm db:roundtrip` en `pnpm check:grants` in een project met de module ai, één keer vers en één keer bijgewerkt vanaf v1.8.0 |
| v1.8.0 | de preview uit `seed`: de route voor een nieuw project (handleiding 04, stap 2 en 07, stap 4c), de seed-branch achteraf met alleen het schema en de overgenomen migratielijst, en een account met wachtwoord op `seed` (handleiding 09) | met de hand, in een Neon-project met een Vercel-koppeling; geen van de drie is gedraaid |
| v1.10.0 | het logboek met alleen feiten dwars door elke mutatie van kern en modules (een code die geen code is, gooit en houdt de transactie tegen); de weigering zonder rol met een echte inlog; de e2e met de proxy als poort ervoor | e2e `e2e:all` en alle `check:<domein>` in de gouden kopie van `voorbeeld`; een inlog zonder app role in een tenant |
| v1.10.0 | in een echt Vercel-project: de regel in de firewall op `/sign-in` (eerst Log), de plek van Attack Mode, de regio van de functies, en hoe een cron zonder geheim (404) in het overzicht van de crons staat; en de luisteraar op de pool bij een verbinding die wegvalt | met de hand, na de eerste deploy; de pool alleen te zien in de log van een draaiende omgeving |
