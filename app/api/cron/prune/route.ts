/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { requireCron } from "@/lib/cron/guard";
import { stepsResponse } from "@/lib/cron/steps";
import { getDb } from "@/lib/db/client";
import { runPrune } from "@/lib/tasks/prune";

/**
 * Nachtelijk opruimen. Een eigen cron en geen regel in een andere: opruimen mag mislukken zonder dat
 * er iets stilstaat, en het hoort niet mee te liften op een taak die wel dringend is. Zie lib/tasks/prune.ts.
 *
 * Mislukt er een stap, dan lopen de andere door en antwoordt de route met status 500 en de naam van
 * de stap, zodat de cron bij de host als mislukt staat (`lib/cron/steps.ts`).
 */
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const context = await requireCron(request);
  if (!context.ok) return context.response;

  return stepsResponse(await runPrune(getDb(), new Date(), "GET /api/cron/prune"));
}
