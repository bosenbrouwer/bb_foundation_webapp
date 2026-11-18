/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De stappen van een cronroute, elk apart opgevangen. Zie besluit D15 en les L-WERK-14.
 *
 * ---
 *
 * **Waarom dit bestaat.** In een eerder project draaide een nachtelijke route acht rondes achter
 * elkaar. De tweede gooide op elke dag behalve maandag, en daardoor liepen de zes erna die nachten
 * ook niet: geen herinneringen, geen drempelmeldingen. Niemand legde dat verband, want de fout in de
 * log ging over de tweede ronde, en een melding die niet komt, mist niemand. De rondes delen een
 * nacht, niet een lot.
 *
 * **Wat het doet.** De stappen lopen na elkaar, in de volgorde waarin ze staan. Gooit er een, dan
 * gaat de fout naar `reportError` met de naam van de stap erbij, en loopt de volgende stap gewoon
 * door. De uitkomst van een mislukte stap is `null`, en `failed` noemt welke het waren.
 * `stepsResponse` antwoordt dan met status 500, zodat de cron bij de host als mislukt staat:
 * opvangen is niet verzwijgen.
 *
 * **Alleen voor stappen die niets van elkaar nodig hebben.** Leest een stap wat de vorige schreef,
 * dan horen die twee in dezelfde stap. En wat een belofte uit de privacyverklaring draagt (een
 * bewaartermijn), krijgt een eigen stap: die mag niet stranden op een fout in een andere.
 */
import { reportError } from "@/lib/monitoring/report";

export type Steps = Record<string, () => Promise<unknown>>;

export type StepResults<T extends Steps> = { [K in keyof T]: Awaited<ReturnType<T[K]>> | null };

export interface StepsRun<R = Record<string, unknown>> {
  readonly results: R;
  /** De namen van de stappen die gooiden, in volgorde. Leeg als alles liep. */
  readonly failed: readonly string[];
}

/** `where` is de naam van de route of de taak, zoals `GET /api/cron/prune`; hij komt in de melding. */
export async function runSteps<T extends Steps>(where: string, steps: T): Promise<StepsRun<StepResults<T>>> {
  const results: Record<string, unknown> = {};
  const failed: string[] = [];

  for (const [name, run] of Object.entries(steps)) {
    try {
      results[name] = await run();
    } catch (error) {
      results[name] = null;
      failed.push(name);
      await reportError(error, { kind: "cron", route: `${where} (${name})` });
    }
  }

  return { results: results as StepResults<T>, failed };
}

/** Het antwoord van een cronroute: de uitkomsten en wat mislukte, met status 500 als er iets mislukte. */
export function stepsResponse(run: StepsRun<unknown>): Response {
  return Response.json({ results: run.results, failed: run.failed }, { status: run.failed.length === 0 ? 200 : 500 });
}
