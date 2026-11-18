<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Patronen

Herbruikbare ontwerppatronen uit eerdere projecten met deze stack. Elk bestand zegt wanneer je het
gebruikt, hoe het werkt, wat het kost en waar het in het template staat, met een klein codevoorbeeld
zonder domeinnamen. Lees het patroon dat bij je taak hoort; de triggertabel staat in `CLAUDE.md`.

Niet elk patroon staat in de code van het template. Waar dat zo is, zegt het bestand het onder
"Waar in het template", met de bouwstenen die het template wel levert. En waar een patroon in een
eerder project nog niet tegen een database of tegen het echte model is bewezen, staat dat erbij.

| Patroon | Eén zin |
|---|---|
| [geld-in-centen](geld-in-centen.md) | Geld is een geheel aantal centen met een valuta, nooit een float |
| [duur-in-minuten](duur-in-minuten.md) | Een duur is een geheel aantal minuten; decimale uren bestaan alleen bij tonen |
| [zacht-verwijderen](zacht-verwijderen.md) | `deleted_at` in plaats van `DELETE`, en elke query filtert erop |
| [audit-log](audit-log.md) | Elke mutatie schrijft in dezelfde transactie een regel die nooit meer verandert |
| [idempotentie-en-lease](idempotentie-en-lease.md) | Werk naar buiten als rij met een unieke sleutel, opgeëist met `for update skip locked` |
| [outbox-en-berichtencatalogus](outbox-en-berichtencatalogus.md) | Mail is een rij in de outbox en een soort in de catalogus; de beheerder bepaalt naar wie |
| [geldigheid-met-exclusion-constraint](geldigheid-met-exclusion-constraint.md) | Tarieven, roosters en andere "geldig van tot" zonder overlap, afgedwongen door Postgres |
| [een-organisatie](een-organisatie.md) | `organisation_id` op elke tabel, en een unieke index die er precies één toestaat |
| [rollen-uit-de-inlogmodule](rollen-uit-de-inlogmodule.md) | Rollen uit het token of uit de database, nooit uit een cookie of de request |
| [versie-zichtbaar](versie-zichtbaar.md) | Eén versie in `lib/version.ts`, zichtbaar in de rail, per pull request omhoog |
| [besluitenlog](besluitenlog.md) | Elk besluit met nummer, datum en prijs in SPEC; omkeren is een nieuw besluit |
| [koppeling-die-netjes-uitstaat](koppeling-die-netjes-uitstaat.md) | Een koppeling zonder variabelen doet niets, zegt wat ontbreekt, en blokkeert niets |
| [checkscript](checkscript.md) | Gedrag bewijzen tegen de dev-branch in een transactie die wordt teruggedraaid |
| [cronroute](cronroute.md) | Een cron is een route achter `CRON_SECRET`, en dezelfde code als `pnpm task:<naam>` |
| [jobhandler-schrijven](jobhandler-schrijven.md) | Een handler per `<systeem>:<operatie>`, idempotent, met `done` of `waiting` |
| [extra-bestandsdoel](extra-bestandsdoel.md) | Een nieuw doel in `lib/files/purposes.ts`, met zijn eigen grens, types en eventueel container |
| [project-tabblad-onder-beheer](project-tabblad-onder-beheer.md) | Een eigen tabblad onder Beheer via `tabs.project.ts`, achter een eigen recht |
| [tweede-ui-taal](tweede-ui-taal.md) | Eén sleutelbron, een tweede taal met `satisfies`, en een test die vergeten vertalingen vindt |
| [sentry-envelope](sentry-envelope.md) | Fouten melden met gescrubde inhoud; klaar voor de gereserveerde module |
| [rollen-schrijven-naar-entra](rollen-schrijven-naar-entra.md) | Rollen toekennen via Graph, als wachtrijtaak; klaar voor de gereserveerde module |
| [ai-gesprek](ai-gesprek.md) | Een wegwijzer kiest per beurt een vaardigheid; schrijven via een knop, bewaren met een termijn |
| [ai-meten](ai-meten.md) | Een testset met een waarheid, één getal, en opnieuw keuren zonder het model |
| [omgeving-per-adres](omgeving-per-adres.md) | Het adres bepaalt de omgeving: alleen de `host`-kop, geen standaard, twee noodstops |
| [accounts-van-buiten](accounts-van-buiten.md) | Een uitnodiging per persoon en een vastgepind account; het mailadres bewijst niets |
| [intrekbare-sessie](intrekbare-sessie.md) | Een tabel `sessions` naast de JWT: één query per verzoek, de rol uit de database |
| [tweede-app-in-de-repo](tweede-app-in-de-repo.md) | Een eigen wortel in dezelfde repo: niets gedeeld, alles gekopieerd, op zes plekken uitgesloten |
| [eigenaar-boven-beheerder](eigenaar-boven-beheerder.md) | De sleutels van de organisatie in één lijst, bij een rol boven de beheerder |
| [niemand-beslist-over-zichzelf](niemand-beslist-over-zichzelf.md) | Wie iets aanvraagt, beslist er niet over; één regel die elk schrijfpad aanroept |
| [veiligheidschecklist](veiligheidschecklist.md) | Elk punt bouwen, instellen of afspreken; het sjabloon voor `docs/veiligheid.md` |
