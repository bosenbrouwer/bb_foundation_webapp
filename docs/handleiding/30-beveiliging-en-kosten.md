<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 30. Beveiliging en kosten in één overzicht

**Wat het is.** Alles wat in de andere handleidingen over beveiliging en kosten staat, bij elkaar,
zodat je het in een kwartier kunt nalopen. Doe dat maandelijks (kosten en vervaldata) en jaarlijks
(accounts en toegang).

## Beveiliging: wat de tool zelf doet

| Wat | Hoe |
|---|---|
| Inloggen | Via Microsoft (rollen uit de tenant; een deploy start niet zonder de eigen tenant in de issuer) of met wachtwoord plus tweestapsverificatie, vergrendeling na vijf pogingen |
| Rechten | Een matrix in de code; elke mutatie controleert het recht in de server action en het filter zit in de query |
| Sessies | Een JWT van acht uur, getekend met `AUTH_SECRET`; wisselen logt iedereen uit |
| Geheimen | Alleen in Vercel (Sensitive) en `.env.local`; de huisregel weigert een waarde in `.env.example` |
| Database | De app verbindt op productie als de rol van de app (geen DDL, de audit log alleen aanvullen), elke tabel heeft Row Level Security met één regel voor die rol, en `pnpm check:grants` bewijst het |
| Audit | Elke mutatie een regel die nooit meer verandert, met wie, wat, wanneer en vanwaar |
| Server actions | Elke action begint met de sessie, vóór de invoer (huisregel `session-first`); alles wat van buiten te raken is, heeft een rem per adres of per account |
| Buitenkant | Security headers (een CSP met een nonce per verzoek, zodat alleen onze eigen scripts draaien; nosniff; geen framing), cronroutes dicht zonder token, downloads via de server met het recht erbij |
| Wat openbaar is | Eén lijst van adressen zonder sessie: de inlog, de inlogbibliotheek en de crons. De proxy stuurt de rest zonder sessiecookie naar de inlog; de huisregel `public-routes` en `pnpm check:public` in de CI bewijzen dat elke pagina en route ook zonder de proxy dicht is. Alles behalve de inlog vraagt zoekmachines om het niet op te nemen |
| Rollen | Een inlog zonder rol uit `project.config.json` komt er niet in, en krijgt bij Microsoft ook geen rij |
| Logboek | Alleen feiten: codes, lengtes, getallen en tijdstippen. Het type weigert vrije tekst, en het schrijven toetst het nog eens |
| Rol van de app | Verbindt productie als eigenaar, dan kleurt Beheer, Systeem rood en ziet een beheerder een balk. De tool werkt door; de rooktest van buiten ziet het niet |
| Mail en bestanden | Tekst van buiten als citaat; de inhoud van een bestand nagekeken voordat hij de opslag in gaat. Een Teams-bericht gaat buiten productie alleen naar een testkanaal |
| AI | Alleen de velden van een prompt gaan mee, als gegevens; elke aanroep via de server met een recht; de inhoud wordt niet bewaard; wat het model zegt, staat als platte tekst op het scherm; in een test gaat nooit een echte aanroep |
| Previews | De database van een preview komt uit de branch `seed`: het schema en de seed, geen echte gegevens. Alleen `main` en `release/next` rollen uit |
| Dev-login | Alleen lokaal, met `APP_ENV=local`; weigert in elke andere omgeving te laden |
| Sessie | Hoogstens acht uur vanaf het inlogmoment, hoe vaak hij ook ververst wordt |
| Koppelen op e-mail | Alleen een dev-account uit de seed; een tweede identiteit met hetzelfde adres neemt geen account over |

## Beveiliging: wat jij doet

- [ ] De zeven regels onder "Klaar voor echte gebruikers" in je checklist (00) kloppen: tweestaps-
      verificatie bij de inlogbron en op elk account bij Vercel, Neon en GitHub, één regel in de
      firewall en de noodknop gevonden (03, stap 8), de regio gecontroleerd, een tweede kopie van de
      database met een geprobeerde terugzet, alleen de dev-branch op een laptop (07), en de CI
      verplicht voor een merge als je abonnement dat toelaat.
- [ ] Tweestapsverificatie aan op GitHub, Vercel, Neon, Azure en bij de mailaanbieder, voor iedereen.
- [ ] Accounts van de organisatie, niet van een persoon.
- [ ] Zo weinig mogelijk beheerders; de lijst jaarlijks nalopen (11).
- [ ] Vervaldata in de checklist en in de agenda: client secret (05), SAS-token (22), app-wachtwoord
      (20b).
- [ ] Bij een vertrek met haast: toegang afnemen én `AUTH_SECRET` wisselen.
- [ ] Bij een vermoeden van een lek: het betreffende geheim wisselen (06), en in de audit log kijken
      wat er gebeurde.
- [ ] `public/.well-known/security.txt` klopt (het adres waar iemand een lek kan melden).
- [ ] De pull requests van Dependabot meenemen in een ronde, en een rode audit, geheimenscan of
      licentiecheck in de CI meteen oppakken. Ook een vondst van Gitleaks in de historie maakt de run
      rood: een echt geheim intrekken en uit de historie halen, een valse bevinding met de reden in
      `.gitleaks.toml` (02).
- [ ] `docs/veiligheid.md` heeft een eigenaar en een datum, en van elk punt dat nog open staat weet
      je waarom.
- [ ] `docs/dreigingsmodel.md` is ingevuld en heeft een eigenaar en een datum. De lijst zegt welke
      maatregelen er zijn, het model zegt waartegen. Vóór een beveiligingsronde heeft elk open punt
      een besluit: dichten met een datum, of aanvaarden met de reden.
- [ ] `seed` is de default branch van het Neon-project, en een preview toont geen gegevens van
      productie (04, 09).
- [ ] Met de module ai: geen prompt stuurt tekst van klanten mee, en de privacyverklaring noemt elke
      toepassing bij naam (24).
- [ ] Met de module ai: het maandplafond staat onder de uitgavenlimiet van de Console, en je weet
      waar de noodstop zit (24).
- [ ] `DATABASE_URL_APP` staat op Production en `pg_stat_activity` toont de inlogrol van de app (04).
- [ ] De Data API van Neon staat uit op elke branch. Controle in de SQL Editor: `select relname from
      pg_class where relrowsecurity and relnamespace = 'public'::regnamespace;` noemt elke tabel, en
      `select count(*) from pg_policies where policyname = 'app_rw_all';` evenveel. Een tabel met slot
      en zonder regel is voor de app leeg.
- [ ] Het herstelvenster van Neon is bekend (op Free hoogstens zes uur, stand oktober 2026), en er
      staat een tweede kopie buiten Neon, met één geprobeerde terugzet en de duur erbij. Zonder dat
      is de tool niet klaar voor echte gegevens. Een module die dat doet, levert het template nog niet.
- [ ] Vóór de eerste echte gebruiker, en daarna na elke grote ronde: een scan met Claude Security,
      met `docs/dreigingsmodel.md` erbij, en elke vondst met een besluit (hieronder).
- [ ] Op elke laptop alleen plugins uit de officiële marketplace, en waar het kan dwingt een beheerde
      instelling dat af (hieronder, "Plugins, hooks en MCP-servers die je installeert").

## Claude Security: meekijken en scannen

Anthropic levert twee plugins voor Claude Code. `.claude/settings.json` zet ze allebei aan voor dit
project, maar een plugin laadt pas als je hem op je eigen laptop installeert. Tot dan doen ze
niets, en staat er in `/plugin`, op het tabblad **Errors**, alleen een regel dat hij hier niet is
geïnstalleerd.

| | security-guidance | claude-security |
|---|---|---|
| Wat | Kijkt mee terwijl Claude schrijft: bij elke bewerking een snelle zoektocht naar riskante patronen, en na elke beurt een aparte review van wat die beurt veranderde. Claude lost een vondst in dezelfde sessie op | Een scan op verzoek, van de hele repo of van een branch, met meerdere agents. Elke vondst wordt door een tweede agent nagekeken voordat hij in het rapport komt |
| Wanneer | Altijd, vanzelf | Vóór de eerste echte gebruiker en na een grote ronde |
| Eigen regels | `.claude/claude-security-guidance.md` en `.claude/security-patterns.json`, van het template | De bestanden die je bij de opdracht noemt |
| Nodig | Python 3.7 of hoger; voor de diepere review 3.10 | `python3` 3.9 of hoger, en een betaald abonnement op Claude |
| Kost | De review na elke beurt is een extra aanroep, standaard op Opus, en telt mee in je verbruik. Een andere keus: de variabele `SECURITY_REVIEW_MODEL` | Een volledige scan kost veel tokens, meer naarmate de repo groter is. Een scan van alleen je branch kost minder |

**Installeren, één keer per kloon.** In een terminal in de map van het project:

```text
claude plugin install security-guidance@claude-plugins-official --scope project
claude plugin install claude-security@claude-plugins-official --scope project
```

In VS Code kan het ook via het venster **Manage plugins** van Claude Code. Meldt Claude Code dat
de marketplace `claude-plugins-official` onbekend is, voeg hem dan toe met
`/plugin marketplace add anthropics/claude-plugins-official` en probeer het opnieuw.

**Een scan op je branch**, op `release/next`, voordat je de pull request opent:

```text
/claude-security scan my branch, and read docs/dreigingsmodel.md and docs/veiligheid.md first
```

**Een scan van de hele repo**, vóór de eerste echte gebruiker: dezelfde opdracht met `scan this
repository`. Doe daarbij ook één keer `/claude-security:attack-surface-analysis`: die zoekt naar wat
zonder inloggen bereikbaar is, naast de lijst in `lib/auth/public-paths.ts`.

**Wat je ermee doet.**

- Het rapport staat in een map `CLAUDE-SECURITY-<tijdstip>/` in je project. Die staat in
  `.gitignore`: een rapport kan een lek beschrijven dat nog open is, en hoort niet in de repo.
- Elke vondst krijgt een besluit in `docs/veiligheid.md` of `docs/dreigingsmodel.md`: dichten met
  een datum, of aanvaarden met de reden.
- Een patch past de plugin nooit zelf toe. Lees de toelichting bij de patch, en zet elke patch als
  eigen ronde via `release/next` (09).
- `docs/dreigingsmodel.md` is het enige dreigingsmodel. Laat `/claude-security:threat-model` geen
  tweede maken; noem het bestaande bij elke scan.

**Wat het niet doet.**

- Beide plugins lezen de code. Een draaiende site testen ze niet; daarvoor is een beveiligingsronde
  tegen een lokale productiebuild (besluit D32).
- Ze houden niets tegen: geen bewerking en geen commit. De harde poorten blijven de huisregels, de
  CI en `pnpm check:public`.
- De plugin heeft een eigen job voor GitHub Actions. Het template zet die niet aan: hij vraagt een
  API-sleutel, en in een openbare repo is zijn rapport voor iedereen te lezen (D33).

## Plugins, hooks en MCP-servers die je installeert

Een plugin, een hook of een MCP-server draait code op je laptop, met jouw rechten. Hij kan bij
`.env.local`, bij je inlog van git en GitHub, en bij de Vercel CLI. Een kwaadaardige of slordige
plugin is dus een lek, ook als de tool zelf dicht is (besluit D34).

**Wat het template doet.**

- De huisregel `claude-settings` houdt de instellingen van Claude Code in de repo schoon. In
  `.claude/settings.json` staat geen hook, geen plugin en geen marketplace buiten de officiële van
  Anthropic, geen MCP-server die zonder vraag wordt goedgekeurd en geen instelling die niet op zijn
  lijst staat; een `.mcp.json` staat er helemaal niet. Hij draait bij `pnpm lint` en in de CI, dus
  een pull request of een sessie van Claude die er iets bij zet, wordt rood.
- `.claude/settings.json` verbiedt Claude om zelf een plugin of MCP-server te installeren
  (`claude plugin` en `claude mcp add`). Installeren doet een mens. Het venster `/plugin` typ je zelf;
  dat houdt deze regel niet tegen.

**Wat jij afspreekt.**

- Alleen plugins uit de officiële marketplace (`claude-plugins-official`). Een plugin van een ander
  alleen na een besluit in `docs/veiligheid.md`, met wie hem heeft nagekeken.
- Kijk vóór het installeren wat een plugin meebrengt: `/plugin` toont of hij hooks of MCP-servers
  heeft. Een hook draait bij elke stap, ook als je er niet naar kijkt.
- Installeer nooit een plugin, MCP-server of VS Code-extensie via een link uit een mail, een chat of
  een forum, ook niet als Claude het voorstelt.
- VS Code-extensies alleen van een geverifieerde uitgever, en zo weinig mogelijk.
- Een MCP-server die je zelf wilt gebruiken, voeg je toe voor jezelf (`--scope local`), niet in de
  repo.

**Wat alleen de organisatie dichtzet.** Wat iemand in zijn eigen instellingen installeert, ziet een
project niet. Dat kan alleen een beheerde instelling: in de beheeromgeving van claude.ai (Team of
Enterprise, met de rol Owner, onder **Organization settings, Claude Code, Managed settings**), of als
`managed-settings.json` op de laptop, waarvoor je beheerrechten nodig hebt. Dit blok staat alleen de
officiële marketplace toe en weigert plugins uit een losse map of van een adres:

```json
{
  "strictKnownMarketplaces": [
    { "source": "github", "repo": "anthropics/claude-plugins-official" },
    { "source": "skills-dir" }
  ],
  "disableSideloadFlags": true
}
```

Heeft je organisatie een eigen marketplace, zet die er dan bij, bijvoorbeeld
`{ "source": "github", "repo": "jouw-organisatie/*" }`. Met `strictPluginOnlyCustomization` mag een
hook of MCP-server alleen nog uit een plugin komen. Dat is strenger, en raakt ook je eigen hooks.

## Het wachtwoord van de eigenaar draaien

Bij een Neon-project dat via de Vercel Marketplace is afgenomen (de organisatie heet in Neon "Vercel:
..."), beheert de integratie `DATABASE_URL` en `DATABASE_URL_UNPOOLED`, en de regels van Production
en Preview zijn met de hand niet te wijzigen (alleen de regel van Development zet je zelf, op `dev`:
06, stap 3). Twee knoppen lijken bedoeld om het wachtwoord van de eigenaar te draaien en zijn allebei
onveilig gebleken: **gebruik niet Rotate secrets** in Vercel (Storage), die pakt volgens meerdere
meldingen in 2026 de laatst aangemaakte branch in plaats van productie; en **Reset password** in Neon
alleen maakt het oude wachtwoord meteen ongeldig terwijl Vercel het nieuwe niet overneemt. Zo wel:

1. Neon, **Connect**, de productiebranch, rol `neondb_owner`, **Connection pooling uit** (de host
   heeft dan geen `-pooler`), kopiëren. Vercel, Settings, Environment Variables, **alleen
   Production**, Sensitive: `DATABASE_URL_OWNER` = die string, met het huidige wachtwoord.
   **Redeploy** productie.
   **Controle:** het buildlog toont "Migreren vanuit omgeving production naar endpoint ep-..." met het
   endpoint van productie en de deploy slaagt. Wijst de string naar een andere branch, dan weigert
   `db:deploy` met "Er is niets gemigreerd".
2. Neon, **Roles**, de productiebranch, bij `neondb_owner` **Reset password**. Kopieer het nieuwe
   wachtwoord meteen.
3. Vercel, `DATABASE_URL_OWNER` (Production): vervang het wachtwoord (tussen de dubbele punt na
   `neondb_owner` en de `@`). **Redeploy** productie, en dezelfde controle als in stap 1.
4. Wat daarna niet meer klopt, en niet erg is: de twee variabelen van de integratie op Production
   houden het oude wachtwoord, maar in productie leest niets ze meer. De app gebruikt
   `DATABASE_URL_APP`, de migraties `DATABASE_URL_OWNER`. Controleer bij de eerstvolgende pull request
   of de preview nog bouwt.

Buiten productie telt `DATABASE_URL_OWNER` niet, ook niet als iemand hem per ongeluk zet: een vaste
waarde zou anders elke preview en elk script op productie zetten. `pnpm doctor` zegt het als hij in
`.env.local` staat.

## Kosten: waar het plafond staat

| Dienst | Plan tijdens het bouwen | Plan met gebruikers | Waar het plafond staat | Wat de rekening maakt |
|---|---|---|---|---|
| GitHub | Free | Free (Team alleen voor branch protection) | Actions-uitgavenlimiet op nul | niets, bij dit gebruik |
| Vercel | Hobby | Pro met Spend Management | Spend Management, een hard bedrag | seats, bouwminuten, functietijd |
| Neon | Free | Free of Launch | het plan; autosuspend en minimum compute | compute die wakker blijft, schrijfvolume, branches |
| Azure (opslag) | pay as you go | pay as you go | een budget met waarschuwing op de resource group | opslag en transacties, centen |
| Mailaanbieder | gratis plan | gratis of laagste | het plan zelf | volume |
| Claude API | tegoed vooraf | tegoed vooraf | de uitgavenlimiet op de workspace, automatisch bijkopen uit, en in de tool het maandplafond en de daglimiet per persoon | tokens per verzoek, nadenken telt als output |
| Microsoft 365 | bestaand | bestaand | niet van toepassing | niets extra |

Geen bedragen hier: die veranderen. Het bedrag per dienst uit je eigen budget staat in je checklist
(tabel Budget), met de datum erbij.

## Kosten: wat jij doet

- [ ] Maandelijks de rekening per dienst tegen het plafond uit je checklist.
- [ ] Bij Neon: autosuspend kort, minimum compute laag, oude branches weg (04).
- [ ] Bij de Claude API: het verbruik onder Beheer, AI tegen de Console, en de prijzen nog actueel (24).
- [ ] Bij Vercel: geen preview zonder pull request; Web Analytics en Observability uit als je ze niet
      gebruikt (03).
- [ ] Zodra er echte gebruikers zijn: Vercel naar Pro met Spend Management, en de wachtrijcrons naar
      elk kwartier in werkuren, niet de klok rond (23, stap 4).
- [ ] Een weggelopen rekening is bijna altijd een vergeten plafond of een compute die niet slaapt.

## Vul in

Noteer dit in `docs/inrichting.md`, niet in dit bestand (zie `00-checklist.md`).

| Wat | Waarde |
|---|---|
| Datum laatste maandelijkse controle | |
| Datum laatste jaarlijkse controle | |
| Wie dit doet | |
