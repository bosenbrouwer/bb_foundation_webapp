<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 09. Werken met een releasebranch

**Wat het is.** De vaste manier om een wijziging live te zetten. Elke ronde komt op de branch
`release/next`. Vercel bouwt daar een preview van, met een eigen database: een verse branch uit
`seed`, met het schema en de seed en zonder echte gegevens. Jij kijkt op die preview, en pas daarna
gaat het naar `main` en dus live. **Tijd:** een kwartier de eerste keer, daarna een paar minuten per
ronde.

**Doe dit na** 08. **Daarna kun je** elke ronde zo opleveren.

## Waarom

Niets gaat live voordat je het op de preview hebt gezien. Op `main` zet Vercel alles meteen op
productie, ook een fout. Op `release/next` zie je eerst of het werkt: de nieuwe schermen, het
inloggen, en of een migratie heen komt op een database met hetzelfde schema. Gaat er iets mis, dan
merkt alleen jij het.

De database van de preview is geen kopie van productie. Hij komt uit de branch `seed` (04), met
alleen het schema, de organisatie en de seed. Een preview blijft staan zolang de deployment bij
Vercel bestaat, en echte gegevens horen daar niet te staan. Dat heeft een prijs; zie "Wat de preview
niet bewijst".

Het is elke keer dezelfde naam. Daardoor heeft de preview steeds hetzelfde adres, en dat adres kun je
bewaren, delen en (met Microsoft-inloggen) één keer bij Microsoft opgeven.

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| De tool staat live (08) | Je werkt verder op iets wat al draait | |
| Vercel bouwt alleen `main` en `release/next` (`vercel.json` en de Ignored Build Step, 03, stap 5) en Neon maakt een databasebranch per preview uit `seed` (04, stap 2 en 3) | Zonder die twee heeft de preview geen eigen database | |
| De branch `seed` is gevuld (07, stap 4c) | De bouw van een preview draait alleen de migraties; de organisatie en de seed komen uit `seed` | |
| VS Code met de map van je project open | Hier doe je de stappen in git | |

## Wat je aanmaakt

| Wat | Naam | Waar de waarde heen gaat |
|---|---|---|
| Een branch, per ronde opnieuw | `release/next` | nergens; na het mergen gaat hij weg |
| Een pull request, per ronde | de versie, zoals `v0.07: diensten aanmaken` | nergens |
| Een databasebranch, vanzelf | `preview/release/next` in Neon, met `seed` als parent | nergens; het is een wegwerpbranch |
| Het vaste previewadres, één keer | `https://<project>-git-release-next-<team>.vercel.app` | `docs/inrichting.md` (Vul in), en bij Microsoft-inloggen een redirect-URI (zie hieronder) |

## Stappen

1. **Begin op een verse `main`.** Klik in VS Code linksonder op de naam van de branch en kies `main`.
   Open **Source Control** (het icoon met de vertakking links) en kies in het menu met de drie
   puntjes **Pull**.
   **Controle:** linksonder staat `main` en er staan geen wijzigingen open in Source Control.
2. **Maak de branch.** Klik linksonder op `main`, kies **Create new branch...** en typ
   `release/next`. Doe dit vóór je Claude de opdracht geeft. Vergeten? Geen probleem: de wijzigingen
   in je werkmap gaan mee naar de nieuwe branch.
   **Controle:** linksonder staat `release/next`.
3. **Laat Claude bouwen.** Claude levert op met een versie en met wat jij nog met de hand doet.
   Claude doet zelf geen git.
   **Controle:** de oplevering noemt de nieuwe versie.
4. **Commit.** In Source Control: typ een boodschap (`feat: diensten aanmaken`) en klik **Commit**.
   Vraagt VS Code of hij alle wijzigingen moet meenemen: ja.
   **Controle:** Source Control is leeg.
5. **Zet de branch op GitHub.** Klik **Publish Branch**. Bij een tweede commit op dezelfde branch
   heet die knop **Sync Changes**.
   **Controle:** op GitHub staat de branch `release/next`.
6. **Open de pull request.** Op de pagina van je repo op GitHub staat een gele balk met **Compare &
   pull request**. Base is `main`, compare is `release/next`. Titel: de versie. Klik **Create pull
   request**.
   **Controle:** de pull request staat open en de CI loopt.
7. **Wacht op de preview.** Vercel bouwt binnen een paar minuten. De bouw draait de migraties op de
   eigen databasebranch van de preview, niet op productie. De Vercel-bot zet daarna een reactie in de
   pull request met een link **Visit Preview**. Het vaste adres werkt ook.
   **Controle:** de check van Vercel is groen en de preview toont het inlogscherm met de nieuwe versie.
8. **Test op de preview.** Log in en klik door wat er nieuw is, in beide modi als het een nieuw scherm
   is. De database is een kopie van `seed` op het moment dat de preview-branch ontstond: het schema,
   de organisatie en de seed. Je account van productie bestaat er dus niet; hoe je inlogt, staat
   hieronder bij "Inloggen op de preview". Wat je hier verandert, raakt productie niet.
   **Controle:** de versie linksonder in de rail is de nieuwe, en wat je zag klopt.
9. **Iets niet goed?** Vraag Claude om de reparatie, commit opnieuw op `release/next` en klik **Sync
   Changes**. Vercel bouwt de preview opnieuw, op hetzelfde adres.
   **Controle:** de preview toont de reparatie.
10. **Merge.** Op GitHub, in de pull request: **Merge pull request**, dan **Confirm merge**. Vercel
    zet het nu live en draait de migraties op productie.
    **Controle:** de productiedeploy is groen en de versie op het productieadres is de nieuwe.
11. **Ruim de branch op.** Klik op GitHub direct na de merge op **Delete branch**. In VS Code:
    linksonder naar `main`, **Pull**, en dan via het opdrachtenpalet (Ctrl+Shift+P) **Git: Delete
    Branch...** en kies `release/next`. Zo kun je de volgende ronde weer dezelfde naam gebruiken.
    **Controle:** linksonder staat `main`, en `release/next` staat niet meer in de lijst van branches.

De volgende ronde begin je weer bij stap 1.

## Inloggen op de preview

### Met Microsoft (module auth-entra)

Je logt in met je eigen Microsoft-account. Je account ontstaat op de preview bij de eerste inlog,
net als op productie, en de rollen komen uit het token; in `seed` hoeft er niets voor te staan.

Microsoft accepteert alleen adressen die letterlijk bij de app staan. Een adres met een sterretje
mag niet. Een preview met een willekeurig adres kan dus niet inloggen, het vaste adres wel. Voeg het
één keer toe, zoals in 05, stap 2:

`https://<project>-git-release-next-<team>.vercel.app/api/auth/callback/microsoft-entra-id`

Neem het adres over uit Vercel: open de deployment van de preview en kijk onder **Domains**. Is de
naam van project en team samen lang, dan kort Vercel het adres in, en dan klopt het voorbeeld
hierboven niet meer.

**Controle:** inloggen met Microsoft op het vaste adres lukt. Op de link uit de Vercel-bot lukt het
niet, en dat is goed.

### Met wachtwoord (module auth-password)

Elk previewadres werkt; het vaste adres blijft handig om te delen. Maar op een preview uit `seed`
bestaat geen enkel account met een wachtwoord: de seed zet alleen dev-accounts neer, en daar is op
een deploy niet mee in te loggen. Maak daarom één keer een account aan op `seed`. **Deze stappen
zijn in het template nog niet tegen een database bewezen. Doe ze de eerste keer met Claude.**

1. Zet `.env.local` tijdelijk op `seed`, zoals in 07, stap 4c, en zet ook een `#` voor de regel
   `DATABASE_URL_APP`: `pnpm invite` en `pnpm dev` lezen die regel het eerst, en hij wijst nog naar
   `dev`.
   **Controle:** `pnpm db:status` toont het endpoint-id van `seed`.
2. `pnpm invite -- <adres> "<naam>" <rol>`. Het script maakt het account aan en drukt een koppeling
   af.
   **Controle:** het script toont het adres, de rollen en één koppeling.
3. Start `pnpm dev` en open de koppeling lokaal: vervang het begin (je productieadres) door
   `http://localhost:3000` en laat `/sign-in/invite/...` staan. Kies een wachtwoord (05b, stap 2).
   **Controle:** "Je account is klaar."
4. Zet `.env.local` terug op `dev`, haal de `#` voor `DATABASE_URL_APP` weg en draai
   `pnpm db:app-login` (07, stap 4c).

Het account staat nu in `seed`, en dus in elke preview-branch die daarna ontstaat. Een
preview-branch die al bestond, heeft het nog niet: het komt mee met de volgende pull request. De
uitnodiging staat ook als bericht in de outbox van `seed`. Is mail op de preview ingericht, dan kan
een preview die mail alsnog versturen, naar het adres van dat account; de koppeling erin werkt dan
niet meer.

Tweestapsverificatie: de pagina om die in te stellen verschijnt bij de eerste inlog van een
beheerder (05b, stap 3). Stel je hem lokaal in, tegen `seed`, dan gaat hij mee naar elke preview. Dat
werkt alleen als de preview het geheim kan lezen. Lokaal wordt het versleuteld met `MFA_SECRET_KEY`
als die in `.env.local` staat, en anders met `AUTH_SECRET`; de preview probeert bij het openen zijn
eigen twee sleutels. Met de waarden uit 06, stap 1 (Preview en Development dezelfde `AUTH_SECRET`,
geen `MFA_SECRET_KEY` in `.env.local`) past dat. Stel je hem in op de preview zelf, dan staat hij
alleen in de database van die preview en doe je het de volgende ronde opnieuw.

## Wat de preview niet bewijst

Een migratie ziet op de preview geen echte data. Een check of een constraint die bestaande rijen
weigert, slaagt op de preview dus altijd, en valt pas om bij de uitrol naar productie. Tel daarom
eerst op productie wat een migratie breekt: laat Claude de telquery schrijven, draai hem in de SQL
Editor van Neon op de productiebranch (alleen lezen), en geef de uitkomst terug voordat de migratie
de pull request in gaat. De regel staat in les L-DRZ-05 in `docs/lessen/drizzle-postgres.md`: een
nieuwe constraint eerst tegen de bestaande data controleren, anders faalt de migratie halverwege.

Faalt een migratie toch bij de uitrol, dan faalt de build en blijft de vorige versie live. Wat vóór
die migratie al was toegepast, staat er wel: elke migratie heeft een eigen transactie. Geef Claude
de melding uit het buildlog.

`seed` loopt niet vanzelf mee met een gewijzigde seed: vul hem dan opnieuw (07, stap 4c).

## Direct op main, de uitzondering

Elke ronde gaat via `release/next`. Direct op `main` is de uitzondering en mag alleen als beide waar
zijn:

- je werkt alleen aan het project, en
- er zijn nog geen echte gebruikers en er staan geen echte gegevens in.

Zodra een collega of een klant de tool gebruikt, werk je op `release/next`. Een fout op `main` staat
direct bij hen in beeld. Een fout op de preview zie alleen jij.

Wie tot nu toe op `main` werkte: begin bij stap 1. Er hoeft niets om.

## Beveiliging

- Previews zijn beschermd met Vercel Authentication (03, stap 4). Wie geen toegang heeft tot je
  Vercel-team, komt niet op het vaste adres. Wil je het toch laten zien, gebruik dan de knop
  **Share** in de werkbalk van de preview.
- De database van de preview komt uit `seed` en bevat geen echte gegevens. Zet ze er zelf ook niet
  in: een preview blijft staan zolang de deployment bij Vercel bestaat.
- De preview heeft een eigen `AUTH_SECRET` (06, stap 1). Een sessie op de preview geldt dus niet op
  productie, en andersom.

## Kosten

Elke pull request kost bouwminuten bij Vercel en een databasebranch bij Neon die even wakker is. Neon
ruimt die branch weer op (04, stap 3). Met één pull request tegelijk blijft dat klein, en de
werkbranches krijgen geen eigen preview (03, stap 5); kijk maandelijks in beide consoles of je binnen
je plan blijft en of er geen oude preview-branches zijn blijven staan. Stand van november 2026.

## Zo zie je dat het goed staat

- Elke ronde heeft een pull request met een groene CI en een groene check van Vercel.
- In Neon staat `preview/release/next` zolang de pull request open is, met `seed` als parent.
- Na het mergen toont productie de nieuwe versie, en `release/next` bestaat niet meer.

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| Na **Publish Branch** bouwt Vercel niets | De branch heet niet precies `release/next`: Vercel bouwt alleen die en `main`. Een naam die begint met een soort werkbranch (`feature/`, `fix/` en de andere uit 03, stap 5) zet `vercel.json` uit; elke andere naam houdt de Ignored Build Step tegen |
| De eerste build van `release/next` faalt op `PRODUCTION_DB_ENDPOINT` of meldt dat hij naar de productiebranch wijst | De preview had nog geen eigen databasebranch, omdat de pull request er nog niet was; de guard hield het tegen en productie is niet geraakt. Open de pull request en klik in Vercel bij die deployment op **Redeploy** |
| **Create new branch** zegt dat `release/next` al bestaat | De vorige ronde is niet opgeruimd. Doe stap 11, dan stap 1 |
| De pull request heeft een conflict met `main` | Er is intussen iets anders op `main` gezet. Vraag Claude om het conflict op te lossen; jij commit daarna |
| De preview toont nog de vorige versie | De bouw loopt nog, of de laatste commit staat niet op GitHub: klik **Sync Changes** |
| Inloggen op de preview lukt niet met Microsoft (AADSTS50011) | Het vaste adres staat niet als redirect-URI bij de app, of je opende de link van de bot. Zie hierboven |
| Met de wachtwoordlogin lukt inloggen op de preview niet | De preview is geen kopie van productie meer: je account van productie bestaat er niet. Alleen een account dat je op `seed` aanmaakte, staat erin, en alleen in een preview-branch die daarna ontstond; zie "Inloggen op de preview" |
| Het wachtwoord klopt, maar de code van tweestapsverificatie wordt op de preview geweigerd | Het geheim is opgeslagen met een sleutel die de preview niet heeft. De preview opent het met `MFA_SECRET_KEY` en anders met zijn eigen `AUTH_SECRET` (05b). Probeer het niet vaker: na vijf foute pogingen gaat het account een kwartier op slot. Geef Claude wat je deed en waar je de tweestap instelde; deze route is nog niet tegen een database bewezen |
| Op de preview kan niemand inloggen | `seed` was nog leeg toen de preview-branch ontstond, en zonder organisatie komt niemand binnen. Met Microsoft staat in de log van Vercel "Er is nog geen organisatie in de database"; met een wachtwoord is het de gewone melding dat inloggen niet lukte. Vul `seed` (07, stap 4c) en open een nieuwe pull request |
| Een migratie faalt in de bouw van de preview | Precies waarvoor de preview er is: productie is niet geraakt. Geef Claude de melding uit de build-log |
| Een migratie slaagt op de preview en faalt bij de uitrol naar productie | De preview heeft geen echte data, dus een check die bestaande rijen weigert, zie je daar niet. De vorige versie staat nog live. Zie "Wat de preview niet bewijst" |
| Je hebt per ongeluk op `main` gecommit | Nog niet gepusht: maak alsnog de branch (stap 2), die neemt de commit mee. Vraag Claude welke stappen `main` weer gelijk zetten met GitHub; jij voert ze uit. Al gepusht: het staat live, zie 90 |

## Vul in

Noteer dit in `docs/inrichting.md`, niet in dit bestand (zie `00-checklist.md`).

| Wat | Waarde |
|---|---|
| Vast previewadres | |
| Redirect-URI toegevoegd in Entra (alleen auth-entra) | |
| Account op `seed` om op de preview in te loggen (alleen auth-password; het adres, nooit het wachtwoord) | |
| Datum ingericht | |
