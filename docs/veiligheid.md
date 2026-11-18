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
| Een tweede factor op het account van de gebruiker | A | open | Bij Entra het beleid van de tenant; bij de wachtwoordlogin de tweestapsverificatie in de tool |

## Netwerk en firewall

| Punt | B, I of A | Stand | Waar of wie |
|---|---|---|---|
| Regels bij de host, en de rem op de inlogpaden | I | open | De rem in de tool: `consumeRateLimit`. Regels bij de host stel je zelf in |
| Geen preview met echte gegevens | I | open | De branch `seed`: `docs/handleiding/04-neon.md` en `09-werken-met-een-releasebranch.md` |
| Niet vindbaar, geen publieke pagina behalve de inlog | B | open | Alles onder `app/(app)/` staat achter de sessie |
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
| Een back-up, en één keer een terugzet geprobeerd voordat er echte gegevens in staan | I | open | Het herstelvenster: `docs/handleiding/30-beveiliging-en-kosten.md`. Een kopie buiten de leverancier levert het template niet |

## Het model

| Punt | B, I of A | Stand | Waar of wie |
|---|---|---|---|
| Het document is data en geen opdracht, het antwoord volgt een schema, de toets staat in code | B | open | De module `ai`: `runPrompt` en `validateProposal` |
| Er gebeurt niets zonder dat een mens keurt | B | open | De module `ai`: `ProposalView`, en schrijven via een knop |
| Het vijandige document blijft in de proeven | B | open | `scripts/check-ai.project.ts` en de testgevallen van de prompt |

## Sporen en toezicht

| Punt | B, I of A | Stand | Waar of wie |
|---|---|---|---|
| Een logboek van wie inlogde, bekeek, uploadde en corrigeerde | B | open | Wijzigingen: de audit log. Inloggen en bekijken logt het template niet |
| Foutmeldingen zonder inhoud, in een eigen project | I | open | `lib/monitoring/report.ts` en `docs/patronen/sentry-envelope.md` |
| Dezelfde poorten als de hoofdapp | B | open | `.github/workflows/ci.yml` |
| Een aanvalsronde met de identiteiten van twee bedrijven tegen elkaar | B | open | Niet in het template |

## Afspraken

| Punt | B, I of A | Stand | Waar of wie |
|---|---|---|---|
| Een verwerkersovereenkomst met de subverwerkers erin | A | open | |
| Een einddatum met export, en daarna alles weg | A | open | |
| Export en verwijderen als knop | B | open | Niet in het template |
