/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { requireCron } from "@/lib/cron/guard";
import { runSteps, stepsResponse } from "@/lib/cron/steps";
import { getDb } from "@/lib/db/client";
import { pruneJobs } from "@/lib/jobs/queue";
import { processJobs } from "@/lib/jobs/run";

/**
 * Het vangnet van de wachtrij: wat de ronde direct na een handeling (lib/jobs/kick.ts) liet liggen,
 * komt hier alsnog aan de beurt. Daarna gaat afgehandeld werk van langer dan dertig dagen geleden weg.
 *
 * Twee stappen met elk hun eigen opvang (`lib/cron/steps.ts`): een fout bij het verwerken houdt het
 * opruimen niet tegen, en het antwoord is dan een 500 met de naam van de stap.
 *
 * Zestig seconden, expliciet: een cron die over zijn tijd gaat wordt stil afgekapt, en dat wil je
 * als storing zien en niet als verdwenen werk.
 */
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const context = await requireCron(request);
  if (!context.ok) return context.response;

  const db = getDb();
  return stepsResponse(
    await runSteps("GET /api/cron/jobs", {
      process: () => processJobs(db),
      prune: () => pruneJobs(db),
    }),
  );
}
