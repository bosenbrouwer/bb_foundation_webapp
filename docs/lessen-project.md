# Lessen van dit project

Wat dit project heeft gekost aan zoeken, in dezelfde vorm als de lessen van het template in
`docs/lessen/`. Die map is van het template en wordt bij een update overschreven; dit bestand is
van het project. `pnpm template:report-back` neemt elke nieuwe les mee in de volgende
terugmelding aan het template (handleiding 12).

Een les is iets dat tijd heeft gekost en opnieuw zou kunnen gebeuren. Schrijf hem pas op als je de
oorzaak kent, niet alleen de oplossing. Elke les krijgt het volgende nummer (`P-01`, `P-02`) en
de vier onderdelen van `docs/lessen/`. Een vijfde, **Voor het template**, schrijf je als je weet
wat het template anders zou moeten doen.

Schrijf in je eigen woorden en zonder namen van klanten, collega's of systemen: de les kan naar het
template, en daar lezen andere projecten mee. Zo ziet een les eruit:

```markdown
## P-01 Een pool zonder luisteraar laat de hele instantie vallen

**Symptoom.** Een weggevallen verbinding stopte het hele proces, niet alleen het ene verzoek.

**Oorzaak.** De pool meldt zo'n fout als gebeurtenis, en die had geen luisteraar.

**Regel.** Elke pool krijgt bij het maken een luisteraar op fouten.

**Afgedwongen door.** De functie die de pool maakt, met een unittest.

**Voor het template.** Dezelfde luisteraar in de verbinding van het template.
```

De lessen van dit project staan hieronder, de nieuwste onderaan.
