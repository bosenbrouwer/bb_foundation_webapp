<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# De veiligheidschecklist

**Wanneer.** Voordat een project echte gebruikers of echte gegevens krijgt, en opnieuw bij elke ronde
die een inlog, een upload, een model of een tweede bedrijf toevoegt. Het template zet de lijst klaar
als `docs/veiligheid.md`; dit patroon is de uitleg erbij.

**Het patroon.** Een lijst waarin bij elk punt staat of je het **bouwt** (B), **instelt** bij een
leverancier (I) of **afspreekt** (A), en in welke ronde. Die indeling is het bruikbare deel: een punt
dat niemand bouwt en niemand instelt, bestaat alleen op papier. De lijst:

- **Toegang:** eigen inlog (B); uitnodiging per persoon, account vastgepind (B); sessie hoogstens
  acht uur, per persoon in te trekken (B); rollen (B); tweede factor van het account van de
  gebruiker (A).
- **Netwerk en firewall:** regels bij de host, de rem op de inlogpaden (I); geen preview met echte
  gegevens (I); niet vindbaar, geen publieke pagina behalve de inlog (B); CSP met nonce, HSTS, niet
  in te bedden (B).
- **Limieten en kosten:** inlogpogingen en uitnodigingen per adres (B); uploads en aanroepen per
  persoon per uur en per dag (B); maandplafond in de database (B); een eigen sleutel met een plafond
  in de console (I); een noodstop (B).
- **Uploads:** type op inhoud, niet op extensie, met een grens op grootte en pagina's (B); een
  document alleen via de app na inlog, getoond als beeld en nooit als HTML (B); dubbele bestanden op
  inhoud (B).
- **Scheiding van gegevens:** database en opslag per bedrijf, elk met een eigen sleutel (I); de rol
  met de minste rechten en een slot per tabel (B); geen geheim van de ene app in de andere (I); een
  back-up, en één keer een terugzet geprobeerd voordat er echte gegevens in staan (I).
- **Het model:** het document is data, geen gereedschap, antwoord naar een schema, toets in code
  (B); er gebeurt niets zonder dat een mens keurt (B); het vijandige document blijft in de proeven
  (B).
- **Sporen en toezicht:** een logboek van wie inlogde, bekeek, uploadde en corrigeerde (B);
  foutmeldingen zonder inhoud, in een eigen project (I); dezelfde poorten als de hoofdapp (B); een
  aanvalsronde met de identiteiten van twee bedrijven tegen elkaar (B).
- **Afspraken:** een verwerkersovereenkomst met de subverwerkers erin (A); een einddatum met export
  en daarna alles weg (A); export en verwijderen als knop (B).

```md
# Veiligheid

Eigenaar van deze lijst: <naam>. Laatst nagelopen: <datum>.

| Punt | B, I of A | Stand | Waar of wie |
|---|---|---|---|
| Een sessie van hoogstens acht uur, per persoon in te trekken | B | open | ronde 2 |
| Geen preview met echte gegevens | I | klaar, <datum> | de branch `seed` is de default in Neon |
| Een tweede factor op het account van de gebruiker | A | klaar, <datum> | afgesproken met <wie> |
```

Twee feiten bij de regels van de host (gelezen in de documentatie van de host op 17 november 2026):
eigen firewallregels zijn er op elk abonnement en kunnen op land filteren; en een regel die weigert,
raakt ook de verzoeken waarmee de host de eigen cron aanroept, dus dat pad moet erbuiten. Begin een
nieuwe regel op "log".

Een eerder project was twee keer doorgelicht en haalde deze lijst toch niet op zeven punten: geen
back-up buiten de leverancier met een geprobeerde terugzet; geen beperking op land of adres; geen
plafond op de sleutel van het model; geen noodstop; geen logboek van wie wat bekeek; geen uitloggen
per persoon (een sessie loopt tot acht uur door, ook na blokkeren bij de identiteitsdienst); en één
database voor alles. Een doorlichting zoekt fouten in wat er is; een checklist vindt wat er niet is
(L-WERK-17).

**Wat het kost.** Nog een document dat bijgehouden moet worden. Zonder eigenaar is het na een maand
een lijst vinkjes die niemand gelooft.

**Waar in het template.** `docs/veiligheid.md` is een seed (besluit D23): het template zet de lijst
één keer klaar, met elk punt op open en per punt een aanwijzing naar wat het template levert. Daarna
is hij van het project; een project van voor v1.9.0 krijgt hem bij het bijwerken. Een aanwijzing is
geen vinkje: een punt staat pas op klaar als iemand het heeft zien werken. Een deel van de B-punten
levert het template al: de CSP met nonce (`proxy.ts`, `lib/security/csp.ts`) en de andere headers
(`lib/config/next-base.ts`), `consumeRateLimit`, de rol van de app en het slot per tabel
(`pnpm check:grants`), de audit log, de module ai (gegevens zijn geen opdracht, een schema, een toets
in code, een mens beslist, en een maandplafond en een noodstop onder Beheer, AI), de module files
(type op inhoud, L-HTTP-02) en de poorten in
`.github/workflows/ci.yml`. De I-punten staan in `docs/handleiding/00-checklist.md` en
`docs/handleiding/30-beveiliging-en-kosten.md`, voor zover het template ze kent. De overige patronen
bij deze lijst: `accounts-van-buiten`, `intrekbare-sessie`, `omgeving-per-adres`.
