<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# De Sentry-envelop

**Wanneer.** Nog niet: dit is het patroon voor de gereserveerde module `monitoring-sentry`. Tot die
er is, logt `lib/monitoring/report.ts` gescrubd naar de console van Vercel.

**Het patroon.** Een fout verlaat de tool nooit met persoonsgegevens erin. Eén functie `reportError`
die de boodschap scrubt (e-mailadressen, tokens, verbindingsstrings, uuid's die naar een persoon
kunnen wijzen) en daarna pas doorgeeft. Met Sentry wordt die doorgave een envelop naar de ingest-URL
uit `SENTRY_DSN`, zonder SDK als het kan: een POST met het event als JSON, een `event_id`, de
`release` gelijk aan `APP_VERSION`, en `environment` uit `VERCEL_ENV`. Zonder DSN staat de koppeling
netjes uit (zie dat patroon). Nooit `user.email` meesturen; `user.id` alleen als dat een uuid is
die buiten de tool niets betekent.

De oorzaak gaat mee als labels, nooit als tekst. `causeTags` loopt de keten van `error.cause` af
(hoogstens vijf diep) en levert `cause_code`, en bij een databasefout `cause_constraint`,
`cause_table` en `cause_column`. Een waarde gaat alleen mee als hij eruitziet als een code of als een
naam uit het schema. `message` en `detail` van de oorzaak gaan nooit mee: Postgres zet daar de
inhoud van de rij in. De regel in de console draagt dezelfde labels.

```ts
export async function reportError(error: unknown, context: { route?: string } = {}): Promise<void> {
  const message = scrubMessage(error instanceof Error ? error.message : String(error));
  const tags = { route: context.route ?? "", ...causeTags(error) };
  console.error(`[report] ${context.route ?? "?"}: ${message}`);
  const dsn = process.env.SENTRY_DSN ?? "";
  if (dsn === "") return;
  const { origin, pathname, username } = new URL(dsn);
  const projectId = pathname.replace("/", "");
  const event = { event_id: crypto.randomUUID().replace(/-/g, ""), timestamp: Date.now() / 1000, platform: "node", release: APP_VERSION, environment: process.env.VERCEL_ENV ?? "local", message, tags };
  const body = `${JSON.stringify({ event_id: event.event_id, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}`;
  await fetchWithTimeout(`${origin}/api/${projectId}/envelope/`, { method: "POST", headers: { "content-type": "application/x-sentry-envelope", "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${username}` }, body }).catch(() => undefined);
}
```

**Wat het kost.** Een gratis plan van Sentry met een limiet op events; de envelop is zo'n twintig
regels en geen afhankelijkheid. De module zal daarbovenop `instrumentation.ts` koppelen aan
`onRequestError` van Next.js en een `HealthProvider` leveren.

**Waar in het template.** `lib/monitoring/report.ts` met `scrubMessage`, `causeTags` en hun test
(besluit D16, les L-WERK-15). De grens ligt in twee patronen, een voor een code en een voor een naam
uit het schema; die horen streng te blijven.
