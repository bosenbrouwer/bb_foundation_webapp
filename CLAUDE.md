# CLAUDE.md

Dit is de repository van het template **BB_foundation_webapp** zelf. De root is tegelijk een
werkend voorbeeldproject met de neutrale standaardconfig. Wie hier werkt, bouwt aan het template;
wie in een project werkt dat uit dit template komt, ziet een CLAUDE.md met dezelfde beheerde blokken
en zijn eigen projecttekst eromheen.

De bouw volgt het plan van 2 oktober 2026 in veertien rondes; de stand staat in `template/README.md`.

<!-- template:begin core -->
## Taal

- **UI-teksten, labels, e-mails en foutmeldingen** staan in de taal uit `project.config.json`
  (`uiLanguage`), in één labelbestand per domein onder `lib/i18n/domain/`, samengesteld in
  `lib/i18n/labels.ts`. De teksten van het template zelf staan in `lib/i18n/template/` in beide
  talen.
- **Code, identifiers, tabelnamen, enumwaarden, routes, commits en comments: Engels.**
- **Documentatie en handleidingen: Nederlands.**
- **Nooit em-dashes** in welke tekst dan ook. Gebruik een komma, dubbele punt, haakjes of een nieuwe
  zin. ESLint en de huisregel `no-em-dash` weigeren ze, en de commit-hook ook.

## Niet-onderhandelbaar, van het template

1. **Rollen komen uit de inlogmodule.** Bij Entra uit de `roles`-claim van het token, bij de
   wachtwoordlogin uit `users.roles`, beheerd door een beheerder in de tool. Nooit uit een cookie of
   de request body. Onbekende rollen vallen weg; wie geen rol heeft, komt er niet in: geen sessie,
   en bij rollen uit het token ook geen rij (besluit D26). Een kopie van de rollen beslist nooit.
2. **`organisation_id` staat op elke tabel met domeinbetekenis** en de data-access laag geeft hem
   verplicht mee. Eén organisatie: multi-tenant-ready, niet multi-tenant.
3. **Alle tijdstippen zijn `timestamptz` in UTC.** Een datum is een aparte `date`-kolom, afgeleid in
   de tijdzone uit de config via `Intl`, nooit via de serverklok.
4. **Geen `localStorage` of `sessionStorage` voor domeindata of voorkeuren.** Voorkeuren staan in
   `user_preferences`, per persoon.
5. **De audit log is append-only**, afgedwongen met een trigger en niet alleen met `REVOKE`: de
   trigger houdt ook de eigenaar tegen (scripts en migraties verbinden als eigenaar), en de rol van
   de app mag hem alleen aanvullen. Loggen gebeurt in dezelfde transactie als de mutatie. In een log
   die je niet kunt opschonen, staan sleutels en aantallen, nooit inhoud: geen gezondheidsgegeven,
   geen vrije tekst over een persoon en geen volledige inhoud van een bewerking in `before` of
   `after`. Het type dwingt dat af (besluit D27): `before` en `after` nemen alleen een code
   (`auditCode`), een lengte (`auditLength`), een getal, een waar of onwaar en een tijdstip aan,
   uit `lib/db/audit-facts.ts`, en `appendAuditLog` toetst het nog eens bij het schrijven.
6. **Elke schrijfactie naar buiten is idempotent**: via `outbox` of `jobs`, met een unieke
   idempotency key en een lease (`claimed_until`, `for update skip locked`). Nooit rechtstreeks
   vanuit een server action.
7. **Verwijderen is zacht** (`deleted_at`), tenzij een besluit in `docs/SPEC.md` voor een tabel
   anders zegt. Hard verwijderen kan alleen langs een controle die twee keer kijkt en een auditregel
   achterlaat.
8. **Kleuren en typografie komen uit de tokens** in `app/theme.css` (gegenereerd) en
   `app/project.css` (van het project). Twee modi, elk scherm klopt in allebei, `pnpm check:contrast`
   schoon. De gids is `docs/THEME.md`.
9. **Update wijzigt, plusje maakt nieuw, en wat opengaat zweeft.** `PanelSection`, `PopoverPanel`,
   één terugpijl via `BackLink`, en meer dan drie onderwerpen splitst in tabbladen met echte routes.
10. **Eén codepad naar de database.** `getDb()` is lui, geen mocks, geen in-memory fallback; lokaal
    tegen een Neon dev-branch, DDL over de ongepoolde verbinding.
11. **Elke mutatie is een server action** die begint met `requireSession()` of `requireActor()` als
    eerste regel, vóór elke blik op de invoer (de huisregel `session-first` controleert dat), en een
    expliciete `can()`. Route handlers alleen voor cron, webhooks en downloads. Autorisatie zit in
    de query, nooit in de UI: `display:none` is geen autorisatie. Een id van buiten gaat eerst door
    `uuidOrUndefined` (`lib/domain/ids.ts`), een keuze door `oneOf` (`lib/domain/one-of.ts`) en
    zoektekst in een `like` door `escapeLike` (`lib/domain/like.ts`): een vreemde waarde is een 404
    of een lege lijst, geen 500. Vrije tekst gaat door `limitedText` (`lib/domain/text-limit.ts`):
    boven het maximum weigeren, niet afkappen, en een `check` op de kolom als harde grens.
    **Wat zonder sessie bereikbaar is, staat op één lijst** (`lib/auth/public-paths.ts`, eigen
    adressen in `public-paths.project.ts`, besluit D25): de huisregel `public-routes` weigert een
    pagina of route erbuiten zonder eigen poort, de proxy stuurt de rest zonder cookie naar de inlog
    (een extra ring, geen grens, D24), en `pnpm check:public` bewijst dat elke pagina en route ook
    zonder de proxy dicht is.
12. **Elke migratie heeft een geteste terugweg**, een gedraaide migratie wordt nooit gewijzigd, een
    nieuwe enumwaarde en het gebruik ervan staan in twee migraties, en hernoemen is uitbreiden en
    inkrimpen in stappen. Zie `lib/db/migrations/README.md`.
13. **Geheimen staan alleen in Vercel en in `.env.local`.** Nooit in de chat, nooit in
    `.env.example` (de huisregel `env-template` controleert dat), en de dev-login werkt alleen met
    `APP_ENV=local` en weigert anders te laden.
14. **Bestanden met de kop `template-owned` of `template-generated` wijzig je niet.** Ze worden bij
    `pnpm template:update` overschreven. Eigen variant nodig: `pnpm template:adopt <pad> --reason
    "waarom"`; de reden komt in `docs/terugmeldingen.md` en gaat mee bij de volgende terugmelding.
    Een gegenereerd bestand verander je via `project.config.json` en `pnpm template:generate`.
15. **Zit er geld of duur in dit project, dan is geld `amount_cents bigint` plus `currency char(3)`
    en duur een geheel aantal minuten.** Nooit een float; afronden gebeurt één keer, op het niveau
    waar het ertoe doet. Zie `docs/patronen/`.
16. **Elke tabel draagt Row Level Security met één regel: de rol van de app mag alle rijen.** Zet
    `appRowAccess()` uit `lib/db/schema/rls.ts` in het blok met indexen van elke nieuwe `pgTable`;
    drizzle zet het slot dan zelf in de migratie, en `rls.test.ts` faalt zonder. Een tabel met slot
    en zonder regel is voor de app leeg, en dat ziet geen test die als eigenaar draait. Wie wat mag
    binnen de app, blijft de app regelen.
17. **Alles wat van buiten te raken is, heeft een rem** via `consumeRateLimit`
    (`lib/domain/rate-limit.ts`): inloggen, codes, herstel, hulpformulieren, en elke action die rijen
    maakt, naar buiten schrijft of een dienst aanroept die geld of het quotum van een gedeelde
    sleutel kost, ook voor wie is ingelogd. De sleutel is het adres voor wie niet is
    ingelogd en het account voor wie dat wel is; de teller telt vóór het werk en ongeacht de uitkomst,
    en de weigering zegt wanneer het weer kan.

## Stack

Next.js (App Router) + TypeScript, Neon Postgres (EU) via Drizzle, Auth.js v5, Tailwind 4 zonder
componentenbibliotheek (de tokens volgen het shadcn/ui-contract), deploy op Vercel.

- Mutaties via server actions. Route handlers alleen voor cron, webhooks en downloads.
- De CSP komt uit `proxy.ts`, met een nonce per verzoek; de andere headers uit
  `lib/config/next-base.ts`. Nooit een tweede CSP-header. De matcher van de proxy slaat alleen de
  bestanden van Next en een pad met de extensie van een bestand over, nooit iets op grond van een
  kop (L-NEXT-24): wat daar wegvalt, ziet ook de poort van de inlog niet. Een eigen `<script>` of
  `next/script` krijgt de nonce uit `(await headers()).get("x-nonce")`, anders weigert de browser
  hem. Een pagina met een punt in het adres is ook een pagina en krijgt de nonce; de eigen pagina's
  van Auth.js onder `/api/auth` krijgen een vaste CSP zonder scripts.
- Migraties met `drizzle-kit`. Elke migratie heeft een geteste terugweg.
- Achtergrondwerk met Vercel Cron, elke cron ook als `pnpm task:<naam>`. Een cron met meer dan
  één ronde draait ze als stappen met `runSteps` (`lib/cron/steps.ts`): een fout in de ene houdt de
  andere niet tegen, en het antwoord is dan een 500 met de naam van de stap.
- Scripts in `package.json` roepen `node --env-file-if-exists=.env.local node_modules/tsx/dist/cli.mjs
  scripts/<x>.ts` rechtstreeks aan, nooit genest `pnpm`: een `&` in een Windows-gebruikerspad breekt
  dat. `next build` nooit met `--env-file`. TypeScript en ESLint staan vastgepind, zie
  `pnpm-workspace.yaml`.

## Mapstructuur

```
app/                    App Router: layout, (app)/ achter de sessie, sign-in/, api/cron|auth|files
app/theme.css           gegenereerd uit project.config.json; app/project.css is van het project
components/ui/          de UI-kit van het template; components/<domein>/ van het project
lib/project/            config.generated.ts (PROJECT), modules.ts, registry.generated.ts
lib/auth/               actor, can, session, token, public-paths, roles.generated, actions.ts en matrix.ts (project)
lib/db/                 client, rows, errors, audit, schema/ (template-index.ts gegenereerd, index.ts project)
lib/i18n/               template/ (beide talen), labels.ts en domain/ (project)
lib/jobs|messaging|files|ai   modules, alleen als ze zijn toegepast
lib/cron/               guard.ts (de poort van elke cronroute) en steps.ts (rondes met elk hun eigen opvang)
lib/integrations/       http.ts (fetchWithTimeout, de enige fetch naar buiten), health.ts (Beheer, Systeem)
lib/monitoring/         report.ts: serverfouten schoongemaakt naar de log, met de oorzaak als labels en nooit de rij; instrumentation.ts in de root hangt het aan Next
lib/domain/             pure functies, elk los te testen: van het template (dates, csv-safe, rate-limit) en van het project
scripts/                pnpm-taken; scripts/lib/ gedeeld; check-<domein>.ts bewijst gedrag tegen de dev-branch
e2e/                    00 tot 09 van het template, vanaf 10 van het project
docs/                   PROJECTPLAN, SPEC (met besluitenlog), ROADMAP, THEME, WERKWIJZE, handleiding/, lessen/, patronen/; lessen-project en terugmeldingen van het project
template/               het gereedschap: manifest, lock-formaat, cli, patchers, generatoren, modules
```

Vuistregels: één bestand, één onderwerp; datatabellen apart van logica; schema's importeren via
`@/lib/db/schema`; pure functies in hun eigen bestand.

## Werkwijze

- **Versie.** `lib/version.ts` is de enige plek, zichtbaar in de rail en op het inlogscherm. Elke PR
  levert een versie op en heet ernaar (`v0.02: eerste specificatie`); de tweede positie loopt per PR
  op, de eerste alleen op het woord van de eigenaar. Ververs ook `APP_HIGHLIGHTS`.
- **Release notes.** Twee bestanden, elk met een eigen lezer. `RELEASE-NOTES.md` voor bouwers, met
  de rubrieken Toegevoegd, Gewijzigd, Gerepareerd, Bewijs, (verplicht als er handwerk is) Let op
  bij bijwerken en (als de ronde iets leerde waar het template beter van wordt) Voor het template.
  `RELEASE-NOTES-KORT.md` voor gebruikers, in gewone taal, met als kop exact `## vX.YY` en de datum
  als eerste regel eronder; de e2e controleert erop.
- **Terugmelden.** Bij elke oplevering kijkt Claude of de ronde iets opleverde dat tijd kostte, een
  bekende oorzaak heeft en opnieuw kan gebeuren. Zo ja: een les in `docs/lessen-project.md`
  (`## P-01`, de vier onderdelen van `docs/lessen/`), of een punt onder Voor het template in
  `RELEASE-NOTES.md`. `pnpm template:report-back` verzamelt het met de nieuwe besluiten en de
  overgenomen bestanden, controleert op namen en geheimen, en zet het na het akkoord van de mens als
  issue bij het template. Claude verstuurt nooit zelf; zie handleiding 12.
- **Besluiten.** In `docs/SPEC.md` onder `## 3. Besluitenlog`, tabel `| # | Besluit | Waarom, en
  wat het kost |`, D-nummers die nooit veranderen, met datum. Een besluit omkeren: eerst tegengas
  met de prijs, de mens kiest, dan volledig uitvoeren, dan vastleggen met een verwijzing naar wat
  het vervangt.
- **Roadmap.** `docs/ROADMAP.md` werk je bij in dezelfde wijziging als het onderdeel.
- **De batterij** voordat iets klaar heet: typecheck, lint plus huisregels, vitest, check:secrets,
  check:licenses, check:migrations, check:drift, check:contrast, template:verify, build,
  check:public (elke pagina en route zonder sessie, tegen die build), migraties heen en terug op de
  dev-branch, alle `check:<domein>`, en de e2e tegen `next start`.
  `pnpm check:all` draait alles en de samenvatting komt in de rubriek Bewijs.
- **Zeg wat bewezen is en wat niet.** Wat zonder database of zonder de echte dienst niet te bewijzen
  was, staat als lijst in het verslag, met waar het bij de eerste echte run het eerst mis kan gaan.
  Documentatie die de code tegenspreekt, is een bevinding en geen slordigheid. En een test met één
  vaste datum bewijst niets over de andere dagen van de week.
- **Fasegrens.** Bouw niets uit een latere fase, ook niet "even snel". Bij twijfel over scope:
  vraag, bouw niet.
- **Handwerk, één stap per bericht.** Leidt Claude iemand door een console (Neon, Vercel, Entra),
  dan per bericht één stap: met waarom, de knoppen letterlijk zoals ze heten, wat je daarna moet
  zien, en wat je terugmeldt.
- **Git doet de mens.** Geen commits, branches of pushes vanuit Claude. Lever de werkkopie op met
  wat erin zit en wat er met de hand moet gebeuren.
- **Opleveren via `release/next`.** Bij elke oplevering stelt Claude voor om de ronde op de vaste
  branch `release/next` te zetten, met een pull request naar `main` en eerst een blik op de preview,
  en noemt de stappen uit `docs/handleiding/09-werken-met-een-releasebranch.md`. Direct op `main`
  alleen als de mens dat zegt en er nog geen echte gebruikers zijn. Claude voert die stappen nooit
  zelf uit.

## Definition of done, per PR

- [ ] `pnpm typecheck` en `pnpm lint` schoon. Geen `any`, geen `!` op databaseresultaten.
- [ ] Migratie heeft een `up` en een `down` die op de dev-branch is uitgevoerd.
- [ ] Elke nieuwe server action die gevoelige velden teruggeeft, heeft een test die bewijst dat een
      rol zonder recht ze niet krijgt.
- [ ] Bedragen en duren zijn getest op de randgevallen: 0, negatief, geen veelvoud, vreemde valuta.
- [ ] De e2e-basisset blijft groen.
- [ ] Nieuwe UI gebruikt alleen tokens en klopt in beide modi; zichtbare focus; `prefers-reduced-motion`
      gerespecteerd; `pnpm check:contrast` schoon.
- [ ] Geen em-dashes in code, copy of commit message.
- [ ] UI-teksten staan in `lib/i18n/`, niet inline.

## Lokaal ontwikkelen

- Database: Neon dev-branch, `vercel env pull .env.local`. Geen lokale Postgres.
- `pnpm db:seed` voor een werkende dataset, idempotent, alleen op de branch uit `SEED_TARGET`.
- Dev-login achter `AUTH_DEV_LOGIN=1` en `APP_ENV=local`, met een harde guard die gooit in elke andere
  omgeving (`lib/domain/deploy-environment.ts`). `vercel env pull` overschrijft `.env.local`: zet
  `APP_ENV=local` er daarna weer in.
- De app werkt lokaal en in de e2e als de rol van de app, net als productie: `pnpm db:app-login`
  maakt de inlogrol op de dev-branch en zet `DATABASE_URL_APP` in `.env.local`; na elke
  `vercel env pull` opnieuw. Scripts en checks blijven als eigenaar werken. Een recht dat de rol
  mist, vind je zo lokaal en niet op productie.
- Een route handler die schrijft en op de sessiecookie leunt, begint met `requestOriginVerdict`
  (`lib/domain/request-origin.ts`), vóór de sessie. Server actions krijgen die controle van Next.
- Een id tegen `actor.id` vergelijk je met `sameId` (`lib/domain/ids.ts`): Postgres let niet op
  hoofdletters, `===` wel. Een fout naar de log met `errorForLog`, naar een scherm met
  `errorForScreen` (`lib/monitoring/error-text.ts`), nooit een ruwe `error.message`.
- Elke cron-taak is ook een `pnpm task:<naam>` script.

## Lessen en patronen

De details staan in `docs/lessen/` (per laag van de stack, met per les symptoom, oorzaak, regel en
waar het template het afdwingt) en `docs/patronen/` (herbruikbare ontwerppatronen met een klein
codevoorbeeld). Lees ze wanneer het onderwerp aan de orde is:

| Als je dit gaat doen | Lees dan eerst |
|---|---|
| een migratie schrijven | `docs/lessen/drizzle-postgres.md`, `docs/lessen/neon.md` |
| een cron of taak | `docs/lessen/vercel.md`, `docs/patronen/cronroute.md`, `docs/lessen/werkwijze.md` (L-WERK-14) |
| iets met inloggen of rollen | `docs/lessen/authjs.md`, `docs/lessen/entra-graph.md` |
| een pagina of route die zonder sessie bereikbaar moet zijn | `lib/auth/public-paths.ts`, `docs/lessen/nextjs.md` (L-NEXT-19, L-NEXT-24) |
| een scherm met formulier of upload | `docs/lessen/nextjs.md`, `docs/lessen/http-bestanden.md` |
| een e2e schrijven | `docs/lessen/nextjs.md` (de e2e-lessen), `docs/lessen/neon.md` |
| een koppeling naar buiten | `docs/patronen/idempotentie-en-lease.md`, `docs/patronen/outbox-en-berichtencatalogus.md` |
| een export, download of CSV | `docs/lessen/http-bestanden.md` |
| een script dat op productie mag draaien | `docs/lessen/werkwijze.md` (L-WERK-07), `docs/lessen/neon.md` (L-NEON-03) |
| een fout die in productie niets achterliet | `docs/lessen/werkwijze.md` (L-WERK-08), `docs/patronen/sentry-envelope.md` |
| een besluit omkeren | `docs/lessen/werkwijze.md` |
| een prompt, een AI-knop of een gesprek | `docs/modules/ai.md`, `docs/lessen/ai.md`, `docs/patronen/ai-gesprek.md`, `docs/patronen/ai-meten.md` |
| een tool klaarmaken voor echte gebruikers | `docs/veiligheid.md` (de lijst van dit project), `docs/dreigingsmodel.md` (waartegen), `docs/patronen/veiligheidschecklist.md`, `docs/handleiding/30-beveiliging-en-kosten.md` |
| rechten boven de beheerder, of iemand die over zichzelf beslist | `docs/patronen/eigenaar-boven-beheerder.md`, `docs/patronen/niemand-beslist-over-zichzelf.md` |
| gebruikers van buiten, meer dan één adres of een tweede app | `docs/patronen/accounts-van-buiten.md`, `docs/patronen/omgeving-per-adres.md`, `docs/patronen/intrekbare-sessie.md`, `docs/patronen/tweede-app-in-de-repo.md` |
| iets dat op Windows of met pnpm anders loopt dan verwacht | `docs/lessen/toolchain-windows.md` |
| iets geleerd waar het template beter van wordt, of een bestand van het template overnemen | `docs/handleiding/12-terugmelden.md`, `docs/lessen-project.md` |
<!-- template:end core -->

<!-- template:begin auth-entra -->
## Inloggen met Microsoft Entra (module auth-entra)

- **Rollen komen uit de `roles`-claim van het token** en nergens anders. Toekennen gebeurt in het
  Entra-beheercentrum, als app roles op de enterprise application; de tool toont alleen wie wat heeft.
  Een rol die niet in `project.config.json` staat, valt weg bij het inlezen.
- **De identiteit van een gebruiker is de `oid` uit het profiel**, met de `sub` van het account als
  terugval. Het `user.id` dat Auth.js aanlevert is per login een willekeurige UUID en wordt nooit
  opgeslagen of vergeleken.
- **Een nieuwe rol** staat eerst in `project.config.json`, dan in de tenant als app role met exact
  dezelfde waarde. De twee lijsten horen gelijk te zijn.
- **Een deploy start niet zonder de uitgever van de eigen tenant.** Ontbreekt
  `AUTH_MICROSOFT_ENTRA_ID_ISSUER` in een preview of in productie, of staat er `common`,
  `organizations` of `consumers` in, dan gooit de provider bij het opstarten
  (`lib/auth/providers/entra-issuer.ts`). Haal dat slot nooit weg om een build te laten slagen: zet
  de variabele.
<!-- template:end auth-entra -->

## Dit project

Voor het template zelf geldt bovendien `template/README.md`: geen projectinhoud en geen namen van
eerdere projecten, van de organisatie of van klanten; elke wijziging aan een owned bestand in `template/CHANGELOG.md`.
