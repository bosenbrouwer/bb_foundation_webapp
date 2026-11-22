# Dreigingsmodel

Eigenaar van dit model: (naam). Laatst bijgewerkt: (datum).

Dit model is van het project. `docs/veiligheid.md` zegt welke maatregelen er zijn; dit bestand zegt
waartegen: wat er te beschermen is, wie het zou willen hebben of breken, en langs welke weg. Vul het
in voordat de tool echte gebruikers of echte gegevens krijgt, en werk het bij na elke ronde die een
inlog, een upload, een model, een koppeling of een tweede bedrijf toevoegt. Een beveiligingsronde
begint hier: de scenario's bepalen de volgorde.

Zo vul je het in:

- Schrijf op wat er is, niet wat er hoort te zijn. Eén zin per punt is genoeg: een halve pagina die
  klopt, is meer waard dan vijf die niemand bijhoudt.
- Geen sleutels, geen adressen van systemen en geen gegevens van echte personen: dit bestand staat in
  de repo.
- Noem bij een kader de editie en de naam van het risico, niet alleen het nummer (L-WERK-20):
  `A01:2025 Broken Access Control`. Hetzelfde nummer betekent in een andere editie iets anders.
- Heeft de tool geen model, dan vervallen de vragen daarover. Laat de regel staan met "geen model":
  bij de volgende ronde kan het er wel zijn.
- Wat tussen haakjes staat, is een voorbeeld. Haal het weg als je de regel invult.

## Wat er te beschermen is

Per soort gegeven: wat het is, van wie het is, en wat het kost als het uitlekt, verandert of weg is.

| Wat | Van wie | Als het uitlekt, verandert of weg is |
|---|---|---|
| (de gegevens van medewerkers) | (de organisatie) | (een melding bij de toezichthouder, en het vertrouwen van de mensen zelf) |

## Wie de aanvaller kan zijn

Begin bij wie de invoer schrijft die de tool leest. Is er een model, dan is dat ook wie de tekst
schrijft die het model leest: de afzender van een document, de schrijver van een omschrijving, een
leverancier. Dat is vaker iemand van buiten dan je denkt.

| Wie | Kan nu al, zonder iets te breken | Is uit op |
|---|---|---|
| Iemand zonder account | | |
| Een gebruiker met de laagste rol | | |
| Wie een document of bericht aanlevert dat de tool leest | | |
| Een beheerder, of iemand met het account van een beheerder | | |

## Grenzen van vertrouwen

Waar gaat iets van buiten naar binnen, en wie of wat controleert het daar? Eén regel per grens.

- De browser naar de server:
- Een upload:
- Een koppeling naar buiten, en wat ervan terugkomt:
- Tekst naar het model, en het antwoord terug:
- Wat de tool onthoudt en later opnieuw gebruikt (correcties, voorbeelden, eerdere documenten): hoe
  ver reikt het (één persoon, één onderdeel, één klant of alle klanten), en wie keurt het voordat het
  telt (L-AI-12)?

## Scenario's, in volgorde

De volgorde is die van een ronde: het ergste dat het makkelijkst kan, staat bovenaan.

| # | Scenario | Kaders | Wat er al staat | Wat een ronde toetst |
|---|---|---|---|---|
| 1 | (een gebruiker leest de gegevens van een ander door een id te wijzigen) | (A01:2025 Broken Access Control) | (de leesfunctie filtert op organisatie en recht) | (elke action en route met het id van een ander) |

## Hertesten, niet opnieuw melden

Wat een eerdere ronde vond en nog open staat. Een volgende ronde toetst deze punten opnieuw en meldt
ze niet als nieuw.

| Punt | Gevonden op | Stand |
|---|---|---|

## Bekend en besloten

Wat bewust zo is, met de reden en wie het besloot: geen nieuwe bevinding in een volgende ronde. Vóór
een ronde heeft elk open punt hierboven en in `docs/veiligheid.md` een besluit: dichten met een datum,
of aanvaarden met de reden (L-WERK-19).

| Punt | Besluit en reden | Wie en wanneer |
|---|---|---|
