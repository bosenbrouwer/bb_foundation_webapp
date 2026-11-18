<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Module files

Bestanden in Azure Blob Storage, met hier alleen de administratie en een downloadroute die het recht
controleert.

## Hoe het werkt

- **Doelen** (`lib/files/purposes.ts`, van het project): per doel de grens en de toegestane types.
  Standaard één doel `documents` met pdf, docx, png en jpg tot vier megabyte.
- **`uploadFile`** controleert de grens, het type en de eerste bytes van de inhoud (en weigert
  Office-bestanden met macro's, en de oude formaten .xls en .doc altijd), schrijft naar de container
  met een PUT die nooit overschrijft (`If-None-Match: *`, een willekeurig stuk in het pad) en
  registreert de rij in `files`. De bewaarde naam krijgt de extensie van het gecontroleerde type. Eén
  persoon brengt hoogstens 100 bestanden per uur. Het SAS-token staat in een variabele op de server
  en bereikt de browser nooit.
- **`FileInput`** (`components/files/file-input.tsx`) is het bestandsveld voor een formulier van het
  project: de toegestane types als `accept`, de grens als regel eronder, en een controle in de
  browser die een te groot bestand tegenhoudt vóór het versturen (`SizedFileInput`, besluit F1).
- **Downloaden** via `/api/files/<id>`: 401 zonder sessie, 404 voor wat niet bestaat of niet mag,
  als bijlage met `nosniff` en zonder cache.
- **Twee sloten**: `files:read` en `files:write` uit de matrix, en de rij-niveau-controle van het
  project in `lib/files/authorize.project.ts`.
- **Zacht verwijderen**: de rij krijgt `deleted_at`, de blob blijft staan (bewaarplicht).
- **Beheer, Systeem** toont of de opslag is ingericht en hoe lang het token nog geldig is
  (`BLOB_SAS_EXPIRES`).

## Besluiten van de module

| # | Besluit | Waarom, en wat het kost |
|---|---|---|
| F1 | **`FileInput` toetst de grens van het doel al in de browser**, vóór het versturen (`SizedFileInput` in `components/files/sized-file-input.tsx`). | De host weigert een verzoek boven 4,5 MB voordat de code het ziet, met een fout waar de server action niets van merkt: de gebruiker krijgt dan een kale foutpagina in plaats van de zin die zegt wat er mis is. Nu staat die zin onder het veld, met dezelfde tekst als de server zou geven, en verstuurt de browser het formulier niet. De controle op de server (`uploadBlob`) blijft de grens die telt: die in de browser is er voor de melding, niet voor de veiligheid. Kost: een clientcomponent in het bestandsveld, en een formulier dat `FileInput` niet gebruikt, heeft de controle niet. |
| F2 | **De upload schrijft rechtstreeks vanuit de server action naar de opslag, niet via de outbox of de wachtrij.** Een uitdrukkelijke uitzondering op regel 6 van `CLAUDE.md`. | Zo is het gebouwd: `uploadFile` (`lib/files/store.ts`) roept `uploadBlob` (`lib/files/blob.ts`) aan, en die doet de PUT naar Azure zelf, vanaf de server, in hetzelfde verzoek. Er is geen idempotentiesleutel en geen lease. Wat het begrenst: het recht `files:write` en de rij-niveau-controle van het project; hoogstens 100 bestanden per persoon per uur, geteld vóór het werk; de grens en de types van het doel en de controle van de inhoud, allemaal vóór het schrijven; en een PUT die nooit overschrijft (`If-None-Match: *` en een willekeurig stuk in het pad). Kost: een upload die twee keer wordt verstuurd, geeft twee blobs en twee rijen. En slaagt de PUT maar mislukt het registreren ("Het bestand is opgeslagen maar niet geregistreerd."), dan staat er een blob zonder rij in de container, die geen code opruimt: het token heeft geen Delete. De reden voor deze keuze staat niet in de code; dit besluit legt vast wat de code doet. |

## Variabelen

`AZURE_STORAGE_ACCOUNT`, `AZURE_STORAGE_CONTAINER`, `AZURE_STORAGE_SAS_TOKEN` (Read, Create, Write;
geen Delete en geen List; met vervaldatum), `BLOB_SAS_EXPIRES`. Zie handleiding 22.

## Bewijs

`pnpm check:files`, `pnpm blob:status` (een pixel erin en eruit met het echte token), e2e
`08-files.spec.ts`.
