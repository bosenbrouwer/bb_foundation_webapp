<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Het besluitenlog

**Wanneer.** Bij elke keuze die later een vraag voorkomt: een regel, een grens, een keuze tussen twee
redelijke dingen, een afwijking van het template.

**Het patroon.** In `docs/SPEC.md` onder `## 3. Besluitenlog` een tabel `| # | Besluit | Waarom, en
wat het kost |`. Elk besluit heeft een nummer dat nooit verandert (`D57`), een datum in de tekst, en
het waarom met de prijs: wat je ervoor opgeeft of wat het later kost om terug te draaien. Over de
tool toont de tabel als kaarten (`lib/docs/read-doc.ts` snijdt op die kop), zodat een collega het
zonder git kan lezen. Een besluit omkeren is een nieuw besluit dat naar het oude verwijst; het oude
blijft staan met een regel "vervangen door D58". Nooit een nummer hergebruiken, nooit een regel
wissen. De eerste nummers zijn van het template; een project nummert door na het laatste besluit dat
in zijn eigen `docs/SPEC.md` staat.

```markdown
| # | Besluit | Waarom, en wat het kost |
|---|---|---|
| D57 | Een dienst kan niet korter zijn dan een uur (3 oktober 2026). | Korter dan een uur is in de praktijk altijd een vergissing. Prijs: een dienst van een half uur moet als uur geboekt worden; komt dat voor, dan heroverwegen we. |
| D58 | Vervangt D52: de wekelijkse herinnering gaat op maandag in plaats van zondag (10 oktober 2026). | Op zondag werd hij niet gelezen. Prijs: wie zondag plant, hoort het een dag later. |
```

**Wat het kost.** Een minuut per besluit. Daar staat tegenover dat "waarom doen we dit zo" altijd
een antwoord heeft, ook als degene die het besloot er niet meer is, en dat een omkering nooit stil
gebeurt.

**Waar in het template.** De seed `docs/SPEC.md` met de besluiten van het template,
`lib/docs/read-doc.ts`, het tabblad Besluiten onder Over de tool, en `docs/WERKWIJZE.md` sectie 5 voor
het omkeerritueel. De modules hebben hun eigen besluiten, met een eigen letter, in `docs/modules/`
(A voor ai, M voor messaging, F voor files).
