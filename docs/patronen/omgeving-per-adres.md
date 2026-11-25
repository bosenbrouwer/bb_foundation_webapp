<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Een omgeving per adres

**Wanneer.** Eén app bedient meer dan één bedrijf, elk op een eigen adres met een eigen database.
Het template gaat uit van één organisatie per database en één adres, en niets hier vraagt om dat te
veranderen: dit is voor het project dat het echt nodig heeft. Lees het als ontwerp met code. In een
eerder project is het gebouwd en getoetst op alles wat puur is, maar het had op 17 november 2026
nog geen database gezien.

**Het patroon.**

- **Alleen de `host`-kop, exact.** Nooit `x-forwarded-host`: die zet een bezoeker zelf.
- **Een onbekend adres krijgt een 404 zonder inhoud, op elk pad,** ook op de route van de inlog en
  de bestanden van het framework. Wie een verzonnen adres probeert, ziet niet dat hier een app draait.
- **Er is geen standaardomgeving.** `getDb(key)` vraagt altijd de sleutel, en het type van de sleutel
  is alleen via één module te maken: een vergeten sleutel is een typefout, geen query op het
  verkeerde bedrijf, en er komt nooit een tekst uit een verzoek in.
- **Elke plek leest het adres opnieuw.** Een kop die de proxy zet, is van buiten niet te
  onderscheiden van een kop die een bezoeker meestuurt.
- **De naam van het bedrijf staat alleen in de database van dat bedrijf.** In code heten omgevingen
  `a` en `b`.
- **In productie verbindt de app alleen als de rol van de app.** Ontbreekt die verbinding, dan
  weigert hij, in plaats van als eigenaar verder te gaan.
- **Twee noodstops.** In de app zet een beheerder de omgeving stil: gewone gebruikers zijn er meteen
  uit (hun sessies worden ingetrokken), beheerders blijven erin om hem weer aan te zetten. Bij de
  host houdt een variabele iedereen buiten, ook op de route van de inlog, en bij twijfel is het
  dicht: een waarde die niet te lezen is, of een sleutel noemt die niet bestaat, stopt alle
  omgevingen. Eén regel (`environmentClosed`) geldt voor de toelating en voor elk verzoek daarna,
  zodat die twee nooit verschillen.
- **In de database.** De eerste migratie neemt `CONNECT` af van `PUBLIC` (L-NEON-12), de rol van de
  app mag het logboek alleen aanvullen (`REVOKE UPDATE, DELETE, TRUNCATE`), en de limieten per
  adres van de aanroeper staan in de database: in het eerdere project dertig keer een uitnodiging
  openen, twintig inlogstarts en tien weigeringen per uur, en na tien weigeringen een uur lang geen
  inlog vanaf dat adres.

```ts
// lib/env/environments.ts (van het project)
declare const made: unique symbol;
export type EnvironmentKey = ("a" | "b") & { readonly [made]: true };

// Addresses come from the configuration of the deploy; never a company name in code.
const HOSTS: ReadonlyMap<string, "a" | "b"> = new Map([["a.example.test", "a"], ["b.example.test", "b"]]);

/** Only the host header, compared exactly. Unknown address: undefined, and the caller answers 404. */
export function environmentForHost(host: string | null): EnvironmentKey | undefined {
  return (host === null ? undefined : HOSTS.get(host)) as EnvironmentKey | undefined;
}

/** Closed when in doubt: an unreadable value, or one naming a key that does not exist, stops all. */
export function environmentClosed(key: EnvironmentKey, raw: string | undefined): boolean {
  const names = (raw ?? "").split(",").map((name) => name.trim()).filter((name) => name !== "");
  return names.some((name) => name !== "a" && name !== "b") || names.includes(key);
}
```

**Wat het kost.** Een database en opslag per omgeving, elk met een eigen sleutel. De dumprol en de
rol van de app krijgen `CONNECT` in productie met de hand. Achter meer dan één adres klopt het
terugkeeradres van Auth.js niet vanzelf (L-NEXT-20), en lokaal werkt de inlog bij Microsoft niet op
`a.localhost`, dus lokaal en in de e2e is de dev-login de weg, door precies dezelfde toelating. De
noodstop in de app laat beheerders binnen: een gestolen beheerdersaccount houdt toegang.

**Waar in het template.** Het template heeft dit niet in code; dit is hoe een project het bouwt.
`getDb()` kent geen sleutel, `proxy.ts` zet alleen de CSP, en zonder `DATABASE_URL_APP` valt de app
stil terug op de eigenaar (L-WERK-11) in plaats van te weigeren. De bouwstenen die het wel levert:
`deployEnvironment` (`lib/domain/deploy-environment.ts`), `consumeRateLimit` met `callerAddress`
(`lib/domain/rate-limit.ts`), `requestOriginVerdict` (`lib/domain/request-origin.ts`), de rol van de
app met `pnpm db:app-login` en `pnpm check:grants`, de trigger op de audit log, en het patroon
`intrekbare-sessie` voor de noodstop in de app.
