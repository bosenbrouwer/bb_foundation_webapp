# Veiligheid

Eigenaar van deze lijst: (naam). Laatst nagelopen: (datum).

Deze lijst is van het project. Hij zegt per punt of je het **bouwt** (B), **instelt** bij een
leverancier (I) of **afspreekt** (A), en hoe het ervoor staat. Een doorlichting zoekt fouten in wat er
is; deze lijst vindt wat er niet is. Loop hem na voordat de tool echte gebruikers of echte gegevens
krijgt, en opnieuw bij elke ronde die een inlog, een upload, een model of een tweede bedrijf toevoegt.
De uitleg bij de lijst staat in `docs/patronen/veiligheidschecklist.md`.

Zo vul je hem in:

- **Stand** is `open`, `klaar` met een datum, of `niet van toepassing` met de reden. Een punt staat
  pas op klaar als iemand het heeft zien werken: een instelling in de console, een test die slaagt,
  een afspraak op papier.
- **Waar of wie** zegt waar het bewijs staat of met wie het is afgesproken. De kolom noemt alvast wat
  het template levert. Dat is een aanwijzing en geen vinkje, en wat een module levert geldt alleen als
  die module aan staat.
- Een punt dat voor dit project niet geldt, zet je op niet van toepassing. Haal de regel niet weg:
  bij de volgende ronde kan hij wel gelden.
- Een lijst zonder eigenaar is na een maand een rij vinkjes die niemand gelooft. Vul de naam in, en
  de datum elke keer dat je hem naloopt.

## Toegang

| Punt | B, I of A | Stand | Waar of wie |
|---|---|---|---|
| Een eigen inlog | B | open | De module `auth-entra` of `auth-password` |
| Een uitnodiging per persoon, het account vastgepind | B | open | `docs/handleiding/11-toegang-beheren.md` |
| Een sessie van hoogstens acht uur, per persoon in te trekken | B | open | De duur: `lib/auth/session-age.ts`. Eén sessie intrekken: `docs/patronen/intrekbare-sessie.md`, niet in het template |
| Rollen | B | open | `project.config.json` en `lib/auth/matrix.ts` |
| Een tweede factor op het account van de gebruiker | I | open | Bij Entra een instelling in de tenant; bij de wachtwoordlogin dwingt de tool hem af voor beheerders |
| Een tweede factor op elk account bij Vercel, Neon en GitHub | I | open | `docs/handleiding/00-checklist.md`, Klaar voor echte gebruikers |
| Een inlog zonder rol komt er niet in | B | open | `lib/auth/callbacks.ts` en de test ernaast (besluit D26) |

## Netwerk en firewall

| Punt | B, I of A | Stand | Waar of wie |
|---|---|---|---|
| Eén eigen regel bij de host: een rem per adres op het inlogscherm, eerst op alleen loggen | I | open | `docs/handleiding/03-vercel.md`, stap 8. De rem in de tool: `consumeRateLimit` |
| Je weet waar de noodknop tegen een aanval zit | A | open | Attack Mode in de Firewall: `docs/handleiding/03-vercel.md`, stap 8 |
| De regio na de eerste deploy gecontroleerd: functies en database in Frankfurt | I | open | `vercel.json` zet `fra1`; kijken doe je zelf (L-VRC-09) |
| Geen preview met echte gegevens | I | open | De branch `seed`: `docs/handleiding/04-neon.md` en `09-werken-met-een-releasebranch.md` |
| Niet vindbaar, geen publieke pagina behalve de inlog | B | open | De lijst in `lib/auth/public-paths.ts`, de proxy, de huisregel `public-routes` en `pnpm check:public` (D24, D25); `X-Robots-Tag: noindex` op alles behalve de inlog |
| Een CSP met nonce, HSTS, niet in te bedden | B | open | `proxy.ts` en `lib/config/next-base.ts` |

## Limieten en kosten

| Punt | B, I of A | Stand | Waar of wie |
|---|---|---|---|
| Inlogpogingen en uitnodigingen per adres | B | open | `consumeRateLimit` |
| Uploads en aanroepen per persoon per uur en per dag | B | open | De module `ai`: de daglimiet per prompt. Eigen actions: `consumeRateLimit` |
| Een maandplafond in de database | B | open | De module `ai`: Beheer, AI, Grenzen |
| Een eigen sleutel met een plafond in de console | I | open | `docs/handleiding/24-claude-api.md` |
| Een noodstop | B | open | De module `ai`: Beheer, AI, Grenzen |

## Uploads

| Punt | B, I of A | Stand | Waar of wie |
|---|---|---|---|
| Het type op inhoud en niet op extensie, met een grens op grootte en pagina's | B | open | De module `files`: type en grootte. Pagina's tel je zelf |
| Een document alleen via de app na inlog, getoond als beeld en nooit als HTML | B | open | De module `files` |
| Dubbele bestanden herkend op inhoud | B | open | Niet in het template |

## Scheiding van gegevens

| Punt | B, I of A | Stand | Waar of wie |
|---|---|---|---|
| Database en opslag per bedrijf, elk met een eigen sleutel | I | open | Alleen bij meer dan één bedrijf: `docs/patronen/omgeving-per-adres.md` |
| De rol met de minste rechten en een slot per tabel | B | open | `pnpm check:grants` en `lib/db/schema/rls.test.ts` |
| Geen geheim van de ene app in de andere | I | open | Alleen bij een tweede app: `docs/patronen/tweede-app-in-de-repo.md` |
| Een tweede kopie van de database buiten de leverancier, en één keer een terugzet geprobeerd met de duur erbij. Zonder dat geen echte gegevens | I | open | Het herstelvenster: `docs/handleiding/30-beveiliging-en-kosten.md`. Een kopie buiten de leverancier levert het template nog niet |
| De app verbindt op productie als de rol van de app, niet als eigenaar | I | open | `docs/handleiding/04-neon.md`; anders kleurt Beheer, Systeem rood (D29) |
| Op een laptop alleen de verbinding met de dev-branch | A | open | `docs/handleiding/07-lokaal-werken.md` (L-WERK-18) |

## Het model

| Punt | B, I of A | Stand | Waar of wie |
|---|---|---|---|
| Het document is data en geen opdracht, het antwoord volgt een schema, de toets staat in code | B | open | De module `ai`: `runPrompt` en `validateProposal` |
| Er gebeurt niets zonder dat een mens keurt | B | open | De module `ai`: `ProposalView`, en schrijven via een knop |
| Het vijandige document blijft in de proeven | B | open | `scripts/check-ai.project.ts` en de testgevallen van de prompt |

## Sporen en toezicht

| Punt | B, I of A | Stand | Waar of wie |
|---|---|---|---|
| Een logboek van wie inlogde, bekeek, uploadde en corrigeerde, met alleen feiten en nooit inhoud | B | open | Wijzigingen: de audit log, die vrije tekst weigert (D27). Inloggen en bekijken logt het template niet |
| Foutmeldingen zonder inhoud, in een eigen project | I | open | `lib/monitoring/report.ts` en `docs/patronen/sentry-envelope.md` |
| Dezelfde poorten als de hoofdapp | B | open | `.github/workflows/ci.yml` |
| De controles van de CI verplicht voor een merge naar `main` | I | open | Branch protection; op een privérepo vraagt dat GitHub Team (D12) |
| Een aanvalsronde met de identiteiten van twee bedrijven tegen elkaar | B | open | Niet in het template |

## Afspraken

| Punt | B, I of A | Stand | Waar of wie |
|---|---|---|---|
| Een verwerkersovereenkomst met de subverwerkers erin | A | open | |
| Een einddatum met export, en daarna alles weg | A | open | |
| Export en verwijderen als knop | B | open | Niet in het template |
