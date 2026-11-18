<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Lessen: Auth.js

Auth.js v5 (next-auth 5.0 beta) met een JWT-sessie. Over identiteit, foutmeldingen, sessieduur, de
dev-login en het token. De vorm van elke les staat in [README.md](README.md).

## L-AUTH-01 `user.id` in de callbacks is niet de identiteit van de provider

**Symptoom.** Gebruikers kwamen na hun eerste login nooit meer binnen ("This account has no
access"). Een rolwijziging via Graph gaf 403 met een melding die naar een ontbrekende permissie
wees, terwijl de permissie er stond.

**Oorzaak.** Auth.js zet `user.id` bij elke login op een nieuwe willekeurige UUID ("intentionally
not set based on the profile id"); de `sub` staat op `account.providerAccountId`. Die UUID werd als
identiteit opgeslagen. Bovendien is de Entra-`sub` per applicatie versleuteld en geen GUID; het
object-id (`oid`) is de GUID die Graph kent.

**Regel.** Identiteit via één pure functie lezen: `oid` uit de profielclaims als sleutel, `sub` uit
`account.providerAccountId` als terugval en om oude accounts te herkennen. `oid` meegeven in
`profile()`. Nooit `user.id` opslaan. Testen met de echte vorm van een login (UUID van Auth.js,
versleutelde `sub`, GUID-`oid`).

**Afgedwongen door.** `lib/auth/providers/entra-identity.ts` (`entraIdentity`) met zijn unittest,
en `lib/auth/providers/entra-profile.ts`.

## L-AUTH-02 Elke fout bij inloggen heet "Configuration"

**Symptoom.** Een halve middag zoeken naar "There is a problem with the server configuration". Bij
een fout in `authorize` stuurt Auth.js zonder uitleg terug naar de inlogpagina.

**Oorzaak.** Auth.js maakt van elke fout in de jwt-callback dezelfde melding. De eerste keer was het
een database zonder migraties; een database zonder organisatierij laat de eerste login op dezelfde
manier vallen.

**Regel.** Een wrapper om alles in de callback dat de database raakt, die de echte oorzaak met de
waarschijnlijke verklaring in de serverlog zet en daarna opnieuw gooit. Een idempotente bootstrap
die het minimum voor inloggen neerzet, veilig op productie, los van de seed. Mailadressen in
logregels maskeren.

**Afgedwongen door.** `withReadableFailure` in `lib/auth/callbacks.ts`, `scripts/db-bootstrap.ts`.

## L-AUTH-03 Een JWT-sessie houdt vast tot de volgende login

**Symptoom.** Iemand die in de applicatie werd uitgeschakeld, bleef tot acht uur binnen. Een
rolwijziging bij de identity provider werkte pas na opnieuw inloggen.

**Oorzaak.** Rollen en organisatie staan in de JWT en worden niet tegen database of identity
provider gehouden tot hij verloopt.

**Regel.** `session.strategy: "jwt"` met een korte `maxAge` (acht uur), en die acht uur gerekend
vanaf het inlogmoment: Auth.js tekent het token bij elke aanvraag van `/api/auth/session` opnieuw voor
de volle `maxAge`, dus `maxAge` alleen schuift mee en een sessie leefde in een eerder project
eindeloos door, met de rollen van het inlogmoment. Daarom een `loginAt` op het token, en de
jwt-callback geeft `null` terug na acht uur (een ontbrekende waarde telt als verlopen). Per request één goedkope
controle of de gebruiker nog actief en niet verwijderd is, via React `cache` zodat het één query per
request blijft; de rollen zelf komen uit het token (Entra) of uit diezelfde query (wachtwoordlogin).
`AUTH_SECRET` per omgeving verschillend, zodat een previewcookie nooit een productiesessie is.
`AUTH_SECRET` wisselen logt iedereen uit en maakt alles onleesbaar wat er verder mee is ondertekend
of versleuteld: leid daarom vanaf dag één per doel een eigen sleutel af. In een eerder project was dat
uitgesteld, en achteraf invoeren breekt alle bestaande handtekeningen.

**Afgedwongen door.** `auth.ts` (de sessieduur), `lib/auth/session-age.ts` met test en de
jwt-callback in `lib/auth/callbacks.ts` (de absolute grens), `currentActor` in `lib/auth/session.ts` (de
controle per request), en in module auth-password `lib/auth/password/secret-box.ts`: de sleutel voor
het geheim van tweestapsverificatie komt met HKDF uit `MFA_SECRET_KEY`, en zonder die variabele uit
`AUTH_SECRET`. De sleutel per omgeving is afspraak, zie `docs/handleiding/06-variabelen-in-vercel.md`.

## L-AUTH-04 Een dev-login met twee harde sloten

**Symptoom.** (voorkomen) Een credentials-provider voor lokaal testen is een achterdeur zodra hij
in een deploy aanstaat.

**Oorzaak.** Een omgevingsvariabele kan per ongeluk in Vercel belanden.

**Regel.** Lokaal identiteit namaken, geen opslag: een credentials-provider waarmee je als geseede
gebruiker met gekozen rollen inlogt. Slot 1: niet registreren zonder `AUTH_DEV_LOGIN=1`. Slot 2: de
module gooit bij het laden tenzij `APP_ENV=local`, zodat een deploy niet start in plaats van stil
open te staan. Een eerdere versie gooide als `VERCEL_ENV` bestond; dat faalde open op elke andere host,
en `NODE_ENV` helpt niet omdat de e2e op `next start` draait. En `APP_ENV=local` wint nooit van
een deploy: wie `.env.example` in bulk in Vercel importeerde, zette anders op een preview een inlog
zonder wachtwoord open (gevonden bij een audit in een eerder project). Verzonnen rollen niet wegschrijven naar een kolom die de identity provider hoort te
spiegelen. Gevolg: op een preview werkt alleen de echte login. Een eigen
`CredentialsSignin`-subklasse vraagt `override code` onder `noImplicitOverride`.

**Afgedwongen door.** `lib/auth/providers/dev-login.ts` (gooit bij laden), `lib/domain/deploy-environment.ts`
met test. De e2e gebruikt dit pad en zet `APP_ENV=local` in `playwright.config.ts`.

## L-AUTH-05 Een token is invoer, ook als je hem zelf ondertekende

**Symptoom.** (voorkomen) Een module-augmentatie van het JWT-type deed niets. Een cookie uit een
vorige versie miste velden.

**Oorzaak.** Het JWT-type woont in `@auth/core/jwt`, een transitieve dependency, en een augmentatie
op `next-auth/jwt` grijpt daar niet op aan. Cookies overleven deploys.

**Regel.** Eigen tokenvelden als namen op één plek. Bij het uitlezen valideren: tekstvelden met een
terugval, en `parseRoles` die onbekende rollen weggooit, zodat een tikfout bij de identity provider
geen rechten oplevert. Een lege `userId` behandelen als niet ingelogd, niet als foutpagina. Onder
`exactOptionalPropertyTypes` een veld weglaten in plaats van `undefined` toekennen.

**Afgedwongen door.** `lib/auth/token.ts` (`TOKEN_FIELDS`, `tokenText`, `actorFromToken`) en
`lib/auth/roles.ts` (`parseRoles`), allebei met unittests.

## L-AUTH-06 Het profiel van de provider zelf vormgeven

**Symptoom.** De standaard Entra-provider haalde bij elke login een profielfoto op en zette die als
base64 in de sessie. De weergavenaam kwam binnen als "Naam | Organisatie": de organisatie twee keer
in beeld en verkeerde initialen. Een lege e-mail zou twee mensen op één rij zetten.

**Oorzaak.** `profile()` doet meer dan nodig, en het token levert wat de tenant erin zet.
`profile()` is bovendien het enige moment waarop de claims van de identity provider nog bestaan.

**Regel.** `profile()` overschrijven: geen foto (cookiegrootte, extra Graph-call), wel `roles` en
`oid` meenemen. E-mail terugvallen op `preferred_username`, en zonder e-mail niet inloggen. De naam
normaliseren voordat hij in het cookie komt, initialen afleiden. Geseede gebruikers krijgen een
plaatshouder als extern id (`dev:<adres>`) en de eerste echte login koppelt op e-mail (unieke index
op `lower(email)`) en zet het echte id. **Alleen zo'n plaatshouder**: een rij die al aan een echte
identiteit hangt, neemt een login op e-mail niet over. In een eerder project kreeg een tweede
identiteit met dezelfde e-mailclaim zo de rij, de rollen en de historie van een ander; de
e-mailclaim is geen betrouwbare sleutel, het object-id wel.

**Afgedwongen door.** Pure functies met unittests: `lib/auth/providers/entra-profile.ts`,
`lib/auth/display-name.ts`, `lib/domain/initials.ts`, `lib/auth/email-fallback.ts`; de koppeling in
`lib/auth/user-sync.ts`, die bij een andere identiteit weigert met een melding in plaats van te botsen
op de unieke index.

## L-AUTH-07 Een server action kijkt eerst naar de sessie en dan naar de invoer

**Symptoom.** Het aanvalsscript vond een nieuwe action die zonder sessie, en als gast, een gewoon
antwoord gaf ("de tekst is te lang") in plaats van een weigering. Er lekte niets.

**Oorzaak.** De action keek eerst of de invoer tekst was en pas daarna naar de sessie. Precies het
patroon dat bij een volgende action wel lekt: een antwoord dat iets over de staat zegt, aan iemand
die er niet hoort te zijn.

**Regel.** De eerste regel van elke geëxporteerde functie in een `"use server"`-bestand is `await
requireActor()` of `await requireSession()`, vóór elke blik op de invoer. Een bewust anonieme
action (inloggen, uitloggen, een hulpformulier op het inlogscherm) krijgt er een commentaar boven
met `session-first:` en de reden.

**Afgedwongen door.** De huisregel `session-first` (`scripts/house-rules/session-first.mjs`),
meeliftend op `pnpm lint`.

## L-AUTH-08 Bij de uitgever `common` wordt de verwachte uitgever uit het token zelf afgeleid

**Symptoom.** (voorkomen) Bij het nalezen van de geïnstalleerde bron van Auth.js (`@auth/core`
0.41.3, `lib/actions/callback/oauth/callback.js`) bleek: bij de uitgever `common` leest de callback
de tenant uit het id-token en zet die in de uitgever waartegen hij dat token toetst.

**Oorzaak.** De verwachte uitgever wordt afgeleid uit hetzelfde token dat hij moet toetsen. Dat klopt
voor meerdere tenants, maar het hangt aan een regel in andermans code. En zonder ingestelde uitgever
valt de provider vanzelf terug op `common` (L-ENTRA-01).

**Regel.** Een tool voor één tenant start niet zonder eigen uitgever: ontbreekt
`AUTH_MICROSOFT_ENTRA_ID_ISSUER`, wijst hij naar `common`, `organizations` of `consumers`, of draagt
hij geen tenant-id als GUID, dan start de app niet. Wie bewust `common` gebruikt, toetst zelf nog
een keer: de tenant is een GUID, de uitgever is exact die van die tenant, de `sub` is niet leeg. En
lees de bron in plaats van hem te vertrouwen, na elke nieuwe versie van Auth.js opnieuw.

**Afgedwongen door.** Module auth-entra: `entraIssuerProblem` in `lib/auth/providers/entra-issuer.ts`
met test; `lib/auth/providers/entra.ts` gooit bij het maken van de provider. De eigen toets bij
`common` heeft het template niet: patroon `accounts-van-buiten`, daar een pure functie met tests.

## L-AUTH-09 Een mailadres uit een token van een andere tenant is geen bewijs

**Symptoom.** (voorkomen) Wie toegang geeft op het mailadres uit een token, laat iedereen binnen die
dat adres in zijn eigen tenant zet.

**Oorzaak.** Een beheerder van een andere tenant zet in het token elk adres dat hij wil.

**Regel.** Toegang hangt aan een uitnodiging per persoon en aan het paar uitgever en `sub`,
vastgepind bij de eerste inlog. Daarna is alleen dat account die persoon. Naam en adres worden
getoond en nergens vergeleken. Een test bewijst dat hetzelfde adres met een andere `sub` er niet in
komt.

**Afgedwongen door.** Het template laat geen accounts van buiten toe, dus hier is het afspraak:
patroon `accounts-van-buiten`, met die test in het project. In een eerder project is de toelating
gebouwd, maar op 17 november 2026 nog niet tegen een database uitgevoerd. Binnen één tenant geldt
dezelfde regel al: de identiteit is de `oid` (L-AUTH-01), en `lib/auth/user-sync.ts` laat een login
op e-mail geen rij overnemen die al aan een andere identiteit hangt (L-AUTH-06).

## L-AUTH-10 De standaard voor `checks` is alleen pkce

**Symptoom.** (voorkomen) Bij het nalezen van de geïnstalleerde bron (`@auth/core` 0.41.3,
`lib/utils/providers.js`) bleek dat een provider zonder eigen `checks` alleen pkce toetst.

**Oorzaak.** De standaard is `["pkce"]`. State en nonce komen er alleen bij als je erom vraagt.

**Regel.** Zet `checks: ["pkce", "state", "nonce"]` op de provider, en bewijs met een echte inlog dat
het daarna nog werkt.

**Afgedwongen door.** Alleen afspraak. In het template is dit op de Entra-provider niet omgezet,
want zonder tenant is niet te bewijzen dat de inlog blijft werken. Een project met een tenant dat
het wil omzetten, neemt `lib/auth/providers/entra.ts` over (`pnpm template:adopt`) en bewijst het
met een echte inlog.
