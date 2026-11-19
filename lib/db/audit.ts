/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Schrijven naar de audit log. Zie CLAUDE.md regel 5.
 *
 * **Altijd in dezelfde transactie als de mutatie waar het over gaat.** Dat is de hele reden dat deze
 * functie een `DbOrTransaction` aanneemt in plaats van zelf `getDb()` te doen: een logregel die apart
 * wordt weggeschreven kan ontbreken terwijl de mutatie er wel is, en dan liegt de log.
 *
 * Terugweg is er niet. De trigger uit de tweede migratie weigert elke `update` en elke `delete` op
 * deze tabel, ook vanaf de verbinding van de applicatie.
 *
 * **Alleen feiten, nooit een zin.** Omdat er niets meer uit te halen is, nemen `before` en `after`
 * alleen sleutels, aantallen, ja of nee en korte codes aan. Het type weigert een tekst uit een
 * variabele, en `assertAuditFacts` weigert bij het schrijven alles wat op een zin lijkt. Zie
 * `audit-facts.ts` en besluit D27.
 */

import { PROJECT } from "@/lib/project/config.generated";
import type { ProjectAuditAction } from "./audit-actions";
import { assertAuditFacts, type AuditChecked, type AuditFacts } from "./audit-facts";
import type { DbOrTransaction } from "./client";
import { auditLog } from "./schema";

/** De handelingen van het template, plus die van het project. */
export type AuditAction = "insert" | "update" | "delete" | "restore" | ProjectAuditAction;

export { auditCode, auditCodes, auditFacts, auditLength, AuditContentError, type AuditCode, type AuditFacts } from "./audit-facts";

export interface AuditEntry<B = AuditFacts, A = AuditFacts> {
  readonly entityTable: string;
  readonly entityId: string;
  readonly action: AuditAction;
  /** Wat er stond bij een update of delete, als feiten. Leeg bij een insert. */
  readonly before?: AuditChecked<B>;
  /** Wat er nu staat bij een insert of update, als feiten. Leeg bij een delete. */
  readonly after?: AuditChecked<A>;
}

/**
 * Wie er handelde.
 *
 * Een ingelogde gebruiker (de `Actor` uit lib/auth voldoet aan deze vorm) of `systemActor()` bij een
 * cron. Het e-mailadres is verplicht in de tabel en de gebruiker niet, precies zodat een cron ook te
 * loggen is zonder een nepgebruiker te verzinnen.
 */
export interface AuditActor {
  /** Leeg betekent geen mens, zie systemActor. */
  readonly id: string;
  readonly email: string;
  readonly organisationId: string;
  /** Waarvandaan, als de aanroep uit een verzoek komt. Een cron heeft geen herkomst. */
  readonly ip?: string | undefined;
  readonly userAgent?: string | undefined;
}

/** Alleen iets dat op een adres lijkt mag de inet-kolom in; de rest wordt leeg. */
function asInet(value: string | undefined): string | null {
  if (value === undefined) return null;
  return /^[0-9a-fA-F.:]+$/.test(value) && /[.:]/.test(value) ? value : null;
}

/** Voor crons en taken, die geen ingelogde gebruiker hebben. Het adres komt uit project.config.json. */
export function systemActor(organisationId: string): AuditActor {
  return { id: "", email: PROJECT.systemEmail, organisationId };
}

/**
 * Zet één regel in de log.
 *
 * `before` en `after` gaan er als `jsonb` in: welke rij, welke velden, welke status, hoeveel. Een
 * vaste tekst in de code mag er direct in; een tekst uit een variabele alleen via `auditCode` of
 * `auditFacts`; vrije tekst alleen als lengte, met `auditLength`. De log is voor beheerders leesbaar,
 * en voor altijd.
 */
export async function appendAuditLog<const B = AuditFacts, const A = AuditFacts>(db: DbOrTransaction, actor: AuditActor, entry: AuditEntry<B, A>): Promise<void> {
  assertAuditFacts(entry.before, "before");
  assertAuditFacts(entry.after, "after");
  await db.insert(auditLog).values({
    organisationId: actor.organisationId,
    actorUserId: actor.id === "" ? null : actor.id,
    actorEmail: actor.email,
    entityTable: entry.entityTable,
    entityId: entry.entityId,
    action: entry.action,
    before: entry.before ?? null,
    after: entry.after ?? null,
    ip: asInet(actor.ip),
    userAgent: actor.userAgent ?? null,
  });
}
