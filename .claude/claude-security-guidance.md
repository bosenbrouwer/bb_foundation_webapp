<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Beveiligingsregels van dit project

Een Next.js-app (App Router) met Auth.js, Postgres via Drizzle, op Vercel. Deze regels gelden voor
elke wijziging. Een overtreding is een bevinding, ook als de code verder werkt.

## Toegang

- Elke mutatie is een server action die als eerste regel `requireSession()` of `requireActor()`
  aanroept, vóór elke blik op de invoer, en daarna een expliciete `can()`. Een route handler is er
  alleen voor cron, webhooks en downloads; een route handler die schrijft en op de sessiecookie
  leunt, roept eerst `requestOriginVerdict` aan.
- Autorisatie zit in de query: een tabel met `organisation_id` filtert op de organisatie van de
  actor, en een rij van een ander is een 404. Iets verbergen in de UI is geen autorisatie.
- Rollen komen alleen uit de inlogmodule (de `roles`-claim van het token of `users.roles`), nooit
  uit een cookie, de request body of een kopie.
- Een pagina of route zonder sessie staat op de lijst in `lib/auth/public-paths.ts` of
  `lib/auth/public-paths.project.ts` en heeft een eigen poort. Al het andere vraagt een sessie.
- Een id tegen `actor.id` vergelijk je met `sameId`, niet met `===`.

## Invoer

- Een id van buiten gaat door `uuidOrUndefined`, een keuze door `oneOf`, zoektekst in een `like`
  door `escapeLike` en vrije tekst door `limitedText`: boven het maximum weigeren, niet afkappen.
- Geen SQL uit tekst samengesteld; `sql.raw` alleen met vaste waarden.
- Een CSV-export gaat langs `csv-safe`, tegen formules in een cel.
- Tekst uit een mail, een bestand of een model staat als platte tekst op het scherm, nooit als HTML.

## Gegevens en logboek

- In de audit log staan alleen feiten (`auditCode`, `auditLength`, een getal, waar of onwaar, een
  tijdstip), nooit vrije tekst, een gezondheidsgegeven of de inhoud van een bewerking.
- Geen `localStorage` of `sessionStorage` voor domeindata of voorkeuren.
- Verwijderen is zacht (`deleted_at`); hard verwijderen alleen langs een controle die twee keer
  kijkt en een auditregel achterlaat.
- Elke nieuwe tabel heeft Row Level Security met `appRowAccess()` en een migratie met een terugweg.

## Naar buiten

- Elke schrijfactie naar buiten loopt via `outbox` of `jobs`, met een idempotency key en een
  lease, nooit rechtstreeks uit een server action.
- Elke fetch naar buiten gaat via `fetchWithTimeout` (`lib/integrations/http.ts`). Een adres dat
  een gebruiker opgeeft, haalt de server niet zonder controle op.
- Alles wat van buiten te raken is, heeft een rem via `consumeRateLimit`: inloggen, codes,
  herstel, formulieren, en elke action die rijen maakt, naar buiten schrijft of een betaalde dienst
  aanroept. De teller telt vóór het werk.
- Een AI-aanroep gaat via de server met een recht en met alleen de velden van de prompt. Wat het
  model teruggeeft, is onbetrouwbare invoer.

## Geheimen en fouten

- Geheimen staan alleen in de omgeving (Vercel, `.env.local`), nooit in code, in `.env.example`,
  in een log of in een antwoord aan de browser. Een waarde met `NEXT_PUBLIC_` is openbaar.
- De dev-login werkt alleen met `APP_ENV=local` en gooit in elke andere omgeving.
- Een fout gaat naar een scherm via `errorForScreen` en naar de log via `errorForLog`, nooit als
  ruwe `error.message` of stacktrace.
- Een eigen script krijgt de nonce uit de CSP; geen tweede CSP-header en geen `unsafe-inline`.
- Tokens, codes en sleutels komen uit `crypto`, nooit uit `Math.random`. Geheimen vergelijk je in
  constante tijd.
