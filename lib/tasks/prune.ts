/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het nachtelijke opruimen: wat weg mag, gaat weg. Gedeeld door de cronroute en `pnpm task:prune`,
 * zodat die twee precies hetzelfde doen.
 *
 * **Wat hier nooit bij komt:** de audit log en zachtverwijderde rijen. De eerste is append-only en
 * de tweede is bewust bewaard. Die twee groeien en dat hoort zo.
 *
 * Het project haakt hier aan via `PROJECT_PRUNE_STEPS` in `prune.project.ts`: elke stap geeft terug
 * hoeveel rijen er weg zijn, voor het log.
 *
 * **Elke stap heeft zijn eigen opvang** (`runSteps`, besluit D15): een stap die gooit, wordt gemeld
 * met zijn naam en houdt de volgende niet tegen. Hangt er aan een stap een belofte uit de
 * privacyverklaring (een bewaartermijn), dan strandt die dus niet op een fout bij het opruimen van
 * iets anders. De uitkomst van een mislukte stap is `null`, en `failed` noemt hem.
 */
import { runSteps, type StepsRun } from "@/lib/cron/steps";
import type { DbOrTransaction } from "@/lib/db/client";
import { pruneRateLimits } from "@/lib/domain/rate-limit";
import { PROJECT_PRUNE_STEPS } from "./prune.project";

export interface PruneStep {
  readonly name: string;
  readonly run: (db: DbOrTransaction, now: Date) => Promise<number>;
}

export const CORE_PRUNE_STEPS: readonly PruneStep[] = [{ name: "rate_limits", run: (db, now) => pruneRateLimits(db, now) }];

export type PruneRun = StepsRun<Record<string, number | null>>;

export async function runPrune(db: DbOrTransaction, now: Date = new Date(), where = "task prune"): Promise<PruneRun> {
  const steps = Object.fromEntries([...CORE_PRUNE_STEPS, ...PROJECT_PRUNE_STEPS].map((step) => [step.name, () => step.run(db, now)]));
  return runSteps(where, steps);
}
