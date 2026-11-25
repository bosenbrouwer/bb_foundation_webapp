<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Module messaging

Mail en meldingen via een outbox, met een catalogus van berichtsoorten en instellingen per soort.
Vereist `jobs`.

## Hoe het werkt

- **Een soort** (`lib/messaging/kinds.ts` plus de catalogus van het project) heeft een kanaal (mail
  of Teams), de doelgroepen die kunnen (`admins`, `person`, `role:<rol>`) met een standaard, en een
  drempel als dat past. De kern brengt mee: `integration_stuck`, `tool_feedback`, `login_help`,
  `account_invite`, `password_reset`, `mfa_setup`.
- **`enqueueKind`** is de ene manier om iets te melden: de instelling van de beheerder zegt of de soort
  aan staat en naar wie; de outbox zorgt dat het één keer gebeurt (sleutel: soort, onderwerp,
  ontvanger).
- **Versturen** gebeurt per ronde: Teams per bericht via een webhook, mail gebundeld per ontvanger
  als HTML in de merkkleuren. Direct na de handeling (`kickOutbox()`) en elke nacht door de cron
  `/api/cron/outbox`, die ook de vastloopmelding doet en opruimt. Dat zijn drie stappen met elk een
  eigen opvang (`runSteps` uit `lib/cron/steps.ts`): `send`, `stuck` en `prune`. Gooit het versturen,
  dan lopen de vastloopcontrole en het opruimen toch, en is het antwoord `{ results, failed }` met
  status 500 en de naam van de stap.
- **Transport** uit `project.config.json`: `smtp` (elke aanbieder met gebruikersnaam en wachtwoord,
  via nodemailer) of `graph` (een gedeelde postbus in Microsoft 365, met `Mail.Send`). Teams alleen
  als `messaging.teams` aan staat.
- **Teams buiten productie alleen naar een testkanaal** (`teamsWebhook` in `lib/messaging/teams.ts`,
  besluit M1). `TEAMS_WEBHOOK_URL` wordt alleen in productie gelezen. Overal elders (lokaal, een
  preview, een onbekende omgeving) telt alleen `TEAMS_WEBHOOK_URL_TEST`; ontbreekt die, dan gaat er
  niets uit en blijft het bericht in de outbox staan. `pnpm teams:test` op een laptop test dus het
  testkanaal.
- **Beheer, Berichten**: de soorten met hun instelling (aan, naar wie, drempel), het logboek met
  filter en "opnieuw aanbieden" voor een mislukt bericht, en "Verstuur wat klaarstaat".
- **Lukt inloggen niet?** op het inlogscherm: een melding zonder sessie, met honingpot en twee
  grenzen, naar de beheerders.

## Besluiten van de module

| # | Besluit | Waarom, en wat het kost |
|---|---|---|
| M1 | **Teams buiten productie alleen naar een testkanaal.** Het echte kanaal (`TEAMS_WEBHOOK_URL`) wordt alleen in productie gelezen; elders telt alleen `TEAMS_WEBHOOK_URL_TEST`, en zonder die variabele gaat er niets uit. | Productie is de sleutel en geen vlag voor testen, want een vlag kun je vergeten: een vlag "dit is een test" die niemand zet, laat een proefbericht van een preview in het kanaal van de collega's landen. Een variabele die alleen in productie telt, kun je niet vergeten. Kost: het echte kanaal is vanaf een laptop of een preview niet te testen; dat doe je na de deploy, op productie, met een echt bericht (handleiding 21). En zonder testkanaal blijft een Teams-bericht buiten productie op "wacht" staan. |

## Variabelen

Transport smtp: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`. Transport graph:
`GRAPH_SENDER_UPN` naast de drie Entra-variabelen. Teams: `TEAMS_WEBHOOK_URL` (alleen Production) en
`TEAMS_WEBHOOK_URL_TEST` (Preview en lokaal). Zie handleiding 20, 20b en 21.

## Bewijs

`pnpm check:messaging`, e2e `07-messages.spec.ts`, `pnpm mail:test -- <adres>` voor één proefmail
langs het echte transport, `pnpm teams:test` voor een proefkaart in het testkanaal.
