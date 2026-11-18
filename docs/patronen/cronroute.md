<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Een cronroute

**Wanneer.** Werk dat op een vast moment moet gebeuren zonder dat iemand ergens op drukt: opruimen,
herinneren, een wachtrij verwerken, een stand bijwerken.

**Het patroon.** Een route handler `app/api/cron/<naam>/route.ts` die begint met `requireCron`: dicht
zonder `CRON_SECRET` (404, zodat de route niet eens lijkt te bestaan), 500 als het geheim niet is
ingesteld, en met de ene organisatie als context. `maxDuration` expliciet op 60, want een cron die
over zijn tijd gaat wordt stil afgekapt. De echte logica staat in `lib/tasks/<naam>.ts` en wordt ook
aangeroepen door `scripts/task-<naam>.ts` (`pnpm task:<naam>`), zodat je hem vanaf je eigen machine
kunt draaien zonder het geheim. Het rooster staat in `vercel.json` via het manifest; op Vercel Hobby
hoogstens één keer per dag, dus werk dat sneller moet gebeurt direct na de handeling (zie de
modules jobs en messaging) en de cron is het vangnet.

Heeft de route meer dan één ronde, dan is elke ronde een eigen stap in `runSteps`
(`lib/cron/steps.ts`). Een stap die gooit, wordt gemeld met de naam van de stap, en de volgende
loopt door. `stepsResponse` antwoordt met `{ results, failed }`, en met status 500 als er een stap
mislukte, zodat de cron bij de host als mislukt staat: opvangen is niet verzwijgen. Alleen voor
stappen die niets van elkaar nodig hebben; leest een stap wat de vorige schreef, dan horen die twee
in dezelfde stap. Wat een belofte uit de privacyverklaring draagt (een bewaartermijn), krijgt een
eigen stap.

```ts
// lib/tasks/reminders.ts: de stappen, gedeeld door de route en het script
export function runReminders(db: DbOrTransaction, organisationId: string, now: Date, where: string) {
  return runSteps(where, {
    reminders: () => sendReminders(db, organisationId, now),
    thresholds: () => sendThresholdAlerts(db, organisationId, now),
  });
}

// app/api/cron/reminders/route.ts
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const context = await requireCron(request);
  if (!context.ok) return context.response;
  return stepsResponse(await runReminders(getDb(), context.organisationId, new Date(), "GET /api/cron/reminders"));
}

// scripts/task-reminders.ts
runScript(async () => {
  const db = getDb();
  const organisation = (await db.select({ id: organisations.id }).from(organisations).limit(1))[0];
  if (organisation === undefined) throw new Error("Geen organisatie; draai pnpm db:bootstrap.");
  const run = await runReminders(db, organisation.id, new Date(), "pnpm task:reminders");
  console.log(run.results);
  await closeDb();
  if (run.failed.length > 0) throw new Error(`Mislukte stappen: ${run.failed.join(", ")}.`);
});
```

**Wat het kost.** Een regel in `vercel.json` (bij het project zelf: rechtstreeks; bij een module:
via het manifest), een script, en de e2e die bewijst dat de route zonder geheim dicht is. Met
stappen: een rode cron bij de host betekent dat één stap mislukte, niet dat de ronde stilstond. De
naam staat in de log, in de regel `[report] cron <route> (<stap>)`, en in `failed` van het antwoord.

**Waar in het template.** `lib/cron/guard.ts` en `lib/cron/steps.ts`, elk met test,
`lib/tasks/prune.ts` (`runPrune`), `app/api/cron/prune/route.ts`, `scripts/task-prune.ts`, de
cronroutes van de modules jobs en messaging, `e2e/04-cron.spec.ts`, en `pnpm smoke:prod` controleert
elke cronroute uit `vercel.json` op de 404. Besluit D15, les L-WERK-14.
