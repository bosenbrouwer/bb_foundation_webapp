<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Een tweede app in dezelfde repo

**Wanneer.** Er komen gegevens of gebruikers bij die niet in de database van de eerste app horen,
terwijl het werk wel bij hetzelfde team en dezelfde repo blijft. In een eerder project hoorden de
gegevens van andere bedrijven en hun gebruikers niet in de productiedatabase van de eerste app, en
werd de proef een eigen app in dezelfde repo. Die app was op 17 november 2026 gebouwd en groen op
typecheck, lint, unittests, build en Semgrep, maar had nog geen database gezien.

**Het patroon.**

- **Een eigen wortel.** De map (bijvoorbeeld `apps/second`) heeft een eigen `package.json`, een eigen
  lockfile en een eigen `pnpm-workspace.yaml` zonder `packages`. Dat laatste bestand maakt de map
  zijn eigen wortel, met dezelfde wachttijd en dezelfde overrides als de eerste app.
- **De twee apps importeren niets van elkaar.** Wat gedeeld is, is gekopieerd. Een lintregel verbiedt
  een import die de map uit gaat.
- **De wortel sluit de map uit op zes plekken:** `tsconfig`, ESLint, vitest, de huisregels, de check
  op ongebruikte exports (namen in de tweede app laten anders een export in de eerste in gebruik
  lijken), en de stylesheet (L-WIN-09).
- **Dependabot met `directories`** in één regel, zodat een update voor beide apps in dezelfde pull
  request komt. Een eigen job in de CI met `working-directory`.
- **De scanners van de wortel lopen over alles.** De geheimenscan keurde een verzonnen
  connectiestring in een test af (L-WIN-08); Semgrep keurde een regex af die uit een variabelenaam
  werd gebouwd.
- **Niet opgelost:** een wijziging in alleen de tweede app start ook een uitrol van de eerste.

```yaml
# apps/second/pnpm-workspace.yaml: no `packages`, so this folder is its own root
minimumReleaseAge: 10080

# .github/dependabot.yml: one entry, so one pull request covers both apps
updates:
  - package-ecosystem: npm
    directories: ["/", "/apps/second"]

# .github/workflows/ci.yml: its own job
  second-app:
    defaults:
      run:
        working-directory: apps/second
```

```css
/* app/globals.css of the first app: do not look for class names in the second app */
@import "tailwindcss";
@source not "../apps";
```

**Wat het kost.** Alles staat er twee keer: de afhankelijkheden, de configuratie en de gekopieerde
code, die uit elkaar gaat lopen zodra één van de twee wordt bijgewerkt. Twee jobs in de CI, en een
uitrol van de eerste app bij elke wijziging in de tweede. In een project uit dit template zijn de
bestanden waar het moet gebeuren van het template (`tsconfig.json`, `eslint.config.mjs`,
`vitest.config.mts`, `app/globals.css`, `scripts/house-rules/files.mjs`, `.github/dependabot.yml`,
`.github/workflows/ci.yml`): de map uitsluiten vraagt per bestand `pnpm template:adopt <pad>`, en
een overgenomen bestand krijgt daarna geen updates meer.

**Waar in het template.** Het template heeft dit niet in code: het is zelf één app, en dit is hoe een
project het bouwt. De plekken waar de wortel nu al mappen uitsluit, zijn het voorbeeld: `exclude` in
`tsconfig.json`, `ignores` in `eslint.config.mjs`, `exclude` in `vitest.config.mts` en de
bestandswandeling van de huisregels (`scripts/house-rules/files.mjs`). Een check op ongebruikte
exports heeft het template niet. De wachttijd en de overrides staan in `pnpm-workspace.yaml`
(L-WERK-12), de scanners in `pnpm check:secrets` en de job `security` van
`.github/workflows/ci.yml`.
