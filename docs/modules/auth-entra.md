<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Module auth-entra

Inloggen met het Microsoft-account van de organisatie. De standaard als er een Microsoft 365-tenant
is waar een beheerder een app mag registreren.

## Hoe het werkt

- De rollen komen uit de `roles`-claim van het token: de app roles die in de tenant zijn aangemaakt
  met exact de waarden uit `auth.roles` in `project.config.json`. Toekennen gebeurt in het
  Entra-beheercentrum; de tool toont alleen (Beheer, Toegang).
- Wie geen rol heeft, komt er niet in. De identiteit is de `oid` van het token, nooit `user.id`.
- `users.roles` is een cache van het laatste token, bijgewerkt bij elke login; adressering van mail
  (module messaging) leest die cache.

## Variabelen

`AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET` (verloopt), `AUTH_MICROSOFT_ENTRA_ID_ISSUER`
met de eigen tenant-id erin. Zie handleiding 05 en 11.

**Geen inlog zonder eigen tenant** (besluit D18). `entraIssuerProblem(issuer, environment)` in
`lib/auth/providers/entra-issuer.ts` toetst de uitgever, en `entraProvider()` gooit bij het maken van
de provider als er iets mis is, dus bij het opstarten en bij de build op de host:

- Ontbreekt de uitgever, dan telt dat alleen in een deploy (preview of productie): daar start de app
  niet. Lokaal, in de CI en in de e2e met de dev-login mag hij ontbreken.
- Wijst hij naar `common`, `organizations` of `consumers`, dan is dat overal fout, ook lokaal.

Zonder die uitgever valt de provider van Auth.js terug op `/common/`, en dan mag ieder
Microsoft-account het proberen. Een vergeten variabele geeft zo een mislukte deploy in plaats van een
inlog die openstaat. Er is geen eis dat de tenant een GUID is. De test staat ernaast
(`entra-issuer.test.ts`).

## Handwerk

De app-registratie, de redirect-URI's (lokaal en productie), de app roles, en de toewijzing van
rollen aan mensen (handleiding 05 en 11).

`pnpm entra:status` controleert wat zonder extra rechten te zien is: de drie variabelen, of de
client-id een GUID is, of de issuer een echte tenant noemt, en of het openbare OpenID-document van
die tenant te lezen is en dezelfde issuer noemt. Daarna drukt het de rollen uit `APP_ROLES` af, om
met de hand naast de app roles in de portal te leggen. De app roles in de tenant en "Assignment
required" leest het niet uit: dat vraagt een Graph-recht dat de inlog niet nodig heeft.

## Gaat niet samen met

`auth-password`. Eén inlogmodule per project. Rollen schrijven naar Entra vanuit de tool is de
gereserveerde module `access-graph`.
