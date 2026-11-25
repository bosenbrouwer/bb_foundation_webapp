<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Checklist: accounts, toegang en kosten

Dit is het volledige stramien, en het is van het template. Vink hier niets af en vul hier niets in:
een wijziging in dit bestand maakt `pnpm template:verify` rood, en een update van het template
overschrijft hem.

**Kopieer dit bestand naar `docs/inrichting.md`, haal daar de eerste regel weg (de kop
`template-owned`), en werk daar.** Dat bestand is van het project: het staat niet in het manifest van
het template, dus een update raakt het nooit. Vink er af wat gedaan is, vul de twee tabellen onderaan
in en houd ze bij, en noteer er wat de handleidingen onder "Vul in" vragen. Waar een handleiding "je
checklist" zegt, is dat deze kopie. Laat je de kop staan, dan weigert de huisregel
`template-ownership` het bestand bij `pnpm lint`.

Een wizard kan van dit stramien ook een persoonlijke versie maken (`00-checklist-<slug>.md`), met de
namen ingevuld en alleen de onderdelen die voor jouw project gelden. Die is ook van het project: dan
vink je daar af, en noteer je in `docs/inrichting.md` wat de handleidingen onder "Vul in" vragen. Geen
geheimen in die bestanden: ze staan in git.

## Voordat je begint

- [ ] Je weet wie de eigenaar van het project is (één persoon beslist).
- [ ] Je weet of er een Microsoft 365-tenant is waar een beheerder een app mag registreren. Ja: de
      inlog gaat via Microsoft (handleiding 05). Nee: eigen accounts met wachtwoord (handleiding 05b).
- [ ] Je hebt een budget per maand afgesproken en weet bij welke dienst het plafond staat
      (handleiding 30).

## Deel 1. Voorbereiding

Vooraf en thuis, ongeveer een uur, in deze volgorde (handleiding 01).

- [ ] 1. Accounts aanmaken: GitHub, Vercel met GitHub als login, Claude met een abonnement dat
      Claude Code bevat. Overal tweestapsverificatie en het plafond per dienst. Neon komt later via
      Vercel.
- [ ] 2. Installeren: Git, Node.js 24, VS Code, Claude Code, pnpm.
- [ ] 3. Git instellen: naam en e-mail.
- [ ] 4. Een werkmap buiten OneDrive.
- [ ] 5. Controleren: `git --version`, `node -v` (begint met `v24`), `pnpm -v` en `claude --version`
      geven elk een versie.
- [ ] 6. Een eerste versie van je projectplan: minstens kopje 1, 2, 3 en 8 (handleiding 10).
- [ ] 7. Klaar: laptop, telefoon met authenticator, inloggegevens, je projectplan.

## Deel 2. Klaarzetten en live (handleiding 01)

Eerst ontwerp je je tool: het projectplan en de keuzes voor `project.config.json` (handleiding 10).
Dan deze acht stappen.

- [ ] 1. GitHub: Use this template, privérepo (handleiding 02).
- [ ] 2. VS Code: Clone Repository, in de werkmap uit de voorbereiding, niet in OneDrive.
- [ ] 3. De startprompt in het Claude-paneel. Met een wizard: plak de prompt van de wizard, Commit en
      Sync wat Claude neerzet, en zeg "gedaan". Met de hand: zet zelf `project.config.json` en
      `docs/PROJECTPLAN.md` klaar, Commit en Sync, en plak dan de prompt uit handleiding 10.
- [ ] 4. Vercel: Add New Project, Neon onder Storage (handleiding 03 en 04).
- [ ] 5. De variabelen die Claude noemt, in Vercel: namen van Claude, waarden alleen van jou (handleiding 06).
- [ ] 6. Commit en Sync: je tool gaat online (handleiding 08).
- [ ] 7. Je eerste account en tweestapsverificatie (handleiding 05b, stap 1 tot 3; met Microsoft handleiding 05).
- [ ] 8. Vanaf nu: werken via `release/next` (handleiding 09).

## Deel 3. Daarna, per dienst afmaken

### GitHub (handleiding 02)

- [ ] Een organisatie, geen persoonlijk account: een persoonlijk account is niet overdraagbaar.
- [ ] Tweestapsverificatie verplicht voor alle leden van de organisatie.
- [ ] Dependabot alerts, Dependabot security updates en secret scanning aan (Settings, Code
      security), en Automatically delete head branches aan (Settings, General).
- [ ] Actions: workflow permissions op alleen-lezen; de uitgavenlimiet voor Actions op nul.
- [ ] Het gratis plan heeft geen branch protection op een privé-repo: de CI is advies. Werk daarom
      altijd via een pull request (werkwijze, sectie 10). Wil je het slot, dan is dat GitHub Team.
- [ ] Zodra er echte gebruikers zijn niet meer rechtstreeks op `main`: wijzigingen gaan via de
      releasebranch `release/next` (handleiding 09).

### Vercel (handleiding 03)

- [ ] Een team, geen persoonlijk account.
- [ ] Functieregio Frankfurt (eu-central-1), bij de database.
- [ ] Hobby tijdens het bouwen; Pro met Spend Management zodra er echte gebruikers zijn (het
      Hobby-plan staat commercieel gebruik niet toe en een cron draait er maar één keer per dag).
- [ ] Deployment Protection aan voor previews.
- [ ] Alleen `main` en `release/next` rollen uit: de soorten werkbranches staan in `vercel.json` onder
      `git.deploymentEnabled` op `false`, en de Ignored Build Step is het tweede slot (handleiding 03,
      stap 5).
- [ ] De variabelen gezet (handleiding 06), met Sensitive aan bij elk geheim.

### Neon (handleiding 04)

- [ ] Een project in Frankfurt, gratis plan tot het niet meer past.
- [ ] Een dev-branch en een branch `seed` naast de productiebranch. `seed` is de default branch (Set
      as default); de productiebranch blijft de production branch.
- [ ] Preview-branches per pull request aan. Ze komen uit `seed`: alleen het schema en de seed, geen
      echte gegevens.
- [ ] `PRODUCTION_DB_ENDPOINT` in Vercel voor alle drie de omgevingen, zodat een preview nooit op
      productie migreert en een productiedeploy nergens anders.
- [ ] Scale to zero en autosuspend op de kortste tijd; history retention op wat je nodig hebt.
- [ ] Je weet waar het herstelpunt (PITR) staat en hoe lang het terugkijkt (op Free hoogstens zes uur).
- [ ] De Data API staat uit op elke branch; de productiebranch staat op Set as protected.
- [ ] Na de eerste deploy: de inlogrol van de app op productie en `DATABASE_URL_APP` op Production,
      met de controle in `pg_stat_activity` (handleiding 04).
- [ ] Het wachtwoord van de eigenaar draai je via `DATABASE_URL_OWNER`, nooit met Rotate secrets
      (handleiding 30).

### Inloggen

**Met Microsoft (handleiding 05 en 11)**

- [ ] De app-registratie met de redirect-URI's van lokaal en productie.
- [ ] De app roles met exact de waarden uit `project.config.json`.
- [ ] "Assignment required" op Yes, en de rollen toegewezen aan de eerste mensen.
- [ ] De vervaldatum van het client secret in de tabel hieronder, met een herinnering een maand ervoor.

**Met wachtwoord (handleiding 05b)**

- [ ] De eerste beheerder uitgenodigd met `pnpm invite` en tweestapsverificatie ingesteld.
- [ ] Afgesproken wie een account mag uitnodigen en wie bij een vermoeden van misbruik ingrijpt.

### Mail en meldingen, alleen als de module messaging aan staat

- [ ] Transport gekozen: Graph (handleiding 20, een gedeelde postbus met `Mail.Send` en een
      ApplicationAccessPolicy) of SMTP (handleiding 20b, een aanbieder met SPF en DKIM op het domein).
- [ ] Eén proefmail verstuurd met `pnpm mail:test`.
- [ ] Teams, alleen als het aan staat: de webhook van het echte kanaal in `TEAMS_WEBHOOK_URL` (alleen
      Production) en die van een testkanaal in `TEAMS_WEBHOOK_URL_TEST`; `pnpm teams:test` plaatst een
      kaart in het testkanaal (handleiding 21).

### Bestanden, alleen als de module files aan staat (handleiding 22)

- [ ] Een storage account in een EU-regio, een privécontainer, een SAS-token met Read, Create en
      Write en een vervaldatum van hoogstens een jaar.
- [ ] De vervaldatum in `BLOB_SAS_EXPIRES` én in de tabel hieronder.
- [ ] Een bewaarbeleid op de container als de bestanden onder een bewaarplicht vallen.

### AI, alleen als de module ai aan staat (handleiding 24)

- [ ] Kopje 10 van het projectplan zegt per prompt wat er naar Claude gaat en wat niet.
- [ ] Een workspace voor deze tool in de Claude Console, met een uitgavenlimiet per maand en
      automatisch bijkopen uit.
- [ ] Een sleutel voor Vercel (Production en Preview, Sensitive) en een eigen sleutel in
      `.env.local`; `pnpm ai:test -- <model>` zegt "Structuur: klopt".
- [ ] Onder Beheer, AI de prijzen per model ingevuld, met de datum in `docs/inrichting.md` (wat
      handleiding 24 onder "Vul in" vraagt).
- [ ] Geen prompt stuurt tekst van klanten mee (handleiding 24, Beveiliging).
- [ ] Onder Beheer, AI, Grenzen staat een maandplafond dat lager is dan de uitgavenlimiet in de
      Console, en de noodstop is één keer geprobeerd (handleiding 24, Kosten).

### Lokaal werken (handleiding 07)

- [ ] `vercel env pull .env.local`, met `APP_ENV=local`, `AUTH_DEV_LOGIN=1` en `SEED_TARGET` erbij,
      `pnpm install`, `pnpm db:status`.
- [ ] `DATABASE_URL` in `.env.local` wijst naar de branch `dev`, niet naar productie; `SEED_TARGET`
      is het endpoint-id van `dev`. `pnpm db:status` toont dat endpoint-id, zet "(komt overeen)" achter
      `SEED_TARGET`, en zegt na de seed "Dit is je wegwerpbranch."
- [ ] De branch `seed` is op dezelfde manier gevuld (migraties, organisatie, seed), en `.env.local`
      wijst daarna weer naar `dev` (handleiding 07, stap 4c).
- [ ] `.env.local` staat niet in `git status`.

### Werken met een releasebranch (handleiding 09)

- [ ] Elke ronde begint op een verse `main` met de branch `release/next`.
- [ ] Het vaste previewadres van `release/next` staat in `docs/inrichting.md` (wat handleiding 09
      onder "Vul in" vraagt); bij inloggen met Microsoft ook als redirect-URI.
- [ ] De preview komt uit `seed` en bevat geen echte gegevens. Met de wachtwoordlogin staat er op
      `seed` één account om op de preview mee in te loggen.
- [ ] Een wijziging wordt op die preview getest en gaat daarna via een pull request naar `main`.
- [ ] Een migratie die bestaande rijen kan weigeren, is eerst op productie geteld: de preview heeft
      geen echte data en ziet dat niet.

### Eerste deploy en rooktest (handleiding 08)

- [ ] De deploy naar productie slaagt en `pnpm smoke:prod` is groen.
- [ ] Je kunt inloggen en ziet de versie linksonder in de rail.
- [ ] `docs/veiligheid.md` is nagelopen voordat er echte gebruikers of echte gegevens in de tool
      komen: de eigenaar en de datum staan erin, en elk punt is klaar, niet van toepassing, of open
      met een reden.
- [ ] `docs/dreigingsmodel.md` is ingevuld: wat er te beschermen is, wie de aanvaller kan zijn, en
      minstens drie scenario's in volgorde.

### Klaar voor echte gebruikers (handleiding 30)

Deze zeven gaan over instellingen in consoles en over afspraken: de code kan ze niet zien. Ze staan
ook in `docs/veiligheid.md`. Pas als ze alle zeven kloppen, gaan er echte gegevens in de tool.

- [ ] Tweestapsverificatie staat aan bij de inlogbron voor iedereen die mag inloggen. Met Microsoft
      is dat een instelling in de tenant; met de wachtwoordlogin dwingt de tool het zelf af voor
      beheerders.
- [ ] Tweestapsverificatie staat aan op elk account met toegang tot Vercel, Neon en GitHub.
- [ ] Bij Vercel staat één eigen firewallregel: een rem per adres op het versturen naar het
      inlogscherm, eerst op alleen loggen. En je weet waar in de Firewall de noodknop tegen een
      aanval zit.
- [ ] De regio is na de eerste deploy gecontroleerd: de functies en de database staan in Frankfurt.
- [ ] Er staat een tweede kopie van de database buiten Neon, en het terugzetten is één keer
      geprobeerd, met de duur erbij. Zonder dat is de tool niet klaar voor echte gegevens.
- [ ] Op een laptop staat alleen de verbinding met de dev-branch, nooit die van productie.
- [ ] De controles van de CI zijn verplicht voor een merge naar `main`, als je abonnement bij GitHub
      dat toelaat.

## Terugkerende controles

- [ ] **Wekelijks**: Beheer, Systeem is groen.
- [ ] **Maandelijks**: de kosten per dienst tegen het plafond; de tabel Vervaldata nagelopen.
- [ ] **Jaarlijks**: `public/.well-known/security.txt` en de lijst met accounts nagelopen.
- [ ] **Bij elke ronde die een inlog, een upload, een model of een tweede bedrijf toevoegt**:
      `docs/veiligheid.md` nagelopen en `docs/dreigingsmodel.md` bijgewerkt, elk met de nieuwe datum
      erin.
- [ ] **Als `pnpm template:status` of `pnpm template:update` openstaande punten noemt**: lessen,
      besluiten en overgenomen bestanden teruggemeld met `pnpm template:report-back`
      (handleiding 12).

## Vervaldata

| Wat | Waar | Verloopt op | Herinnering gezet |
|---|---|---|---|
| Client secret van de app-registratie | Entra | | |
| SAS-token van de bestandsopslag | Azure | | |
| Wachtwoord of app-wachtwoord van de mailaanbieder | | | |

## Budget

| Dienst | Plan | Waar het plafond staat | Deel van het budget |
|---|---|---|---|
| GitHub | gratis, organisatie | Actions-uitgavenlimiet op nul | |
| Vercel | Hobby, later Pro | Spend Management | |
| Neon | gratis, later Launch | het plan zelf, autosuspend | |
| Azure (opslag) | pay as you go | een budgetwaarschuwing op de resource group | |
| Mailaanbieder | | | |
| Claude API | tegoed vooraf, automatisch bijkopen uit | de uitgavenlimiet op de workspace | |
