/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Een antwoord van het model is invoer. Twee hulpmiddelen die daar bovenop `validateProposal` komen
 * (docs/modules/ai.md, "Een antwoord is invoer", lessen L-AI-01 en L-AI-06).
 *
 * **Korte sleutels in plaats van id's** (`keyed`). Laat je het model kiezen uit rijen van de
 * database, noem ze in de gegevens dan `w1`, `w2`, ... en nooit bij hun id. Het model kiest een
 * sleutel, de code zoekt de rij erbij, en een sleutel die niet bestaat, valt weg. Het model ziet
 * nooit een id en kan er dus ook geen verzinnen of er een uit een andere organisatie noemen.
 *
 * **Een onbekende keuze wordt de keuze die niets doet** (`enumOr`). Stuurt een antwoord het vervolg
 * (welke stap, welke soort), dan leidt alles wat geen geldige waarde is naar de onschuldige tak, en
 * nooit naar een tak die iets doet.
 */
import { oneOf } from "@/lib/domain/one-of";

export interface Keyed<T> {
  /** De sleutel zoals hij in de gegevens voor het model staat, bijvoorbeeld `w1`. */
  readonly key: string;
  readonly item: T;
}

export interface KeyedList<T> {
  readonly entries: readonly Keyed<T>[];
  /** De rij bij een sleutel uit het antwoord; `undefined` bij alles wat geen sleutel van deze lijst is. */
  readonly find: (key: unknown) => T | undefined;
}

const PREFIX = /^[a-z]{1,3}$/;

/** Geeft elke rij een korte sleutel: het voorvoegsel met een volgnummer vanaf 1. */
export function keyed<T>(prefix: string, items: readonly T[]): KeyedList<T> {
  if (!PREFIX.test(prefix)) throw new Error(`keyed: het voorvoegsel "${prefix}" is geen een tot drie kleine letters`);
  const entries = items.map((item, index) => ({ key: `${prefix}${index + 1}`, item }));
  const byKey = new Map(entries.map((entry) => [entry.key, entry.item]));
  return {
    entries,
    find: (key) => (typeof key === "string" ? byKey.get(key) : undefined),
  };
}

/** De keuze van het model als hij op de lijst staat, en anders de keuze die niets doet. */
export function enumOr<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return oneOf(value, allowed) ?? fallback;
}
