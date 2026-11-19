/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Wat er in het logboek mag staan: sleutels, aantallen, ja of nee, en korte codes. Nooit een zin.
 *
 * Het logboek vult alleen aan (CLAUDE.md regel 5): wat erin staat, is er nooit meer uit te halen. Een
 * naam, een titel, een reden of een bestandsnaam hoort daarom op de rij zelf, waar hij op te schonen
 * is, en in het logboek alleen dát hij er was en hoe lang hij is. In een eerder project was dat een
 * afspraak, en die werd op tien plekken gebroken; de zwaarste was de reden van een afwijzing over een
 * persoon. Hier dwingt het type het af, met een controle bij het schrijven erachter (besluit D27).
 *
 * - **Een vaste tekst in de code** mag er direct in: `{ event: "password_reset" }`.
 * - **Een tekst uit een variabele** mag er alleen in via `auditCode(...)`, die weigert wat geen korte
 *   code is, of via `auditFacts(...)` voor een hele platte rij.
 * - **Vrije tekst** komt er alleen in als lengte: `{ titleLength: auditLength(title) }`.
 *
 * Geef nooit invoer van een gebruiker aan `auditCode`: een spatie erin laat de hele mutatie mislukken.
 * Dat is de bedoeling, want dan was het geen code.
 */

declare const auditCodeBrand: unique symbol;

/** Een korte code: een sleutel, een status, een rol, een model-id, een datum. Maak hem met `auditCode`. */
export type AuditCode = string & { readonly [auditCodeBrand]: true };

export type AuditValue = number | boolean | null | AuditCode | readonly AuditValue[] | AuditFacts;

export interface AuditFacts {
  readonly [key: string]: AuditValue | undefined;
}

/**
 * Wat een aanroeper mag meegeven. Een vaste tekst (een letterlijke waarde in de code) gaat erdoor,
 * een `string` uit een variabele niet: die wordt `never`, en dan zegt de compiler dat het niet past.
 * Zie je die fout, pak de waarde dan in met `auditCode`, of geef de lengte met `auditLength`.
 */
export type AuditChecked<T> = T extends AuditFacts
  ? T
  : T extends string
    ? string extends T
      ? never
      : T
    : T extends number | boolean | null | undefined
      ? T
      : T extends readonly (infer U)[]
        ? readonly AuditChecked<U>[]
        : T extends object
          ? { readonly [K in keyof T]: AuditChecked<T[K]> }
          : never;

/** Letters, cijfers en de tekens van een sleutel, een pad, een datum of een model-id. Geen spatie, geen apenstaartje. */
const CODE = /^[A-Za-z0-9_.:/+-]{1,120}$/;

export class AuditContentError extends Error {
  constructor(where: string, length: number) {
    /* Nooit de waarde zelf in de melding: die kan een naam of een reden zijn, en een fout gaat naar de log. */
    super(`Het logboek neemt bij ${where} alleen een korte code aan, geen vrije tekst (${length} tekens geweigerd). Geef een sleutel, of de lengte met auditLength.`);
    this.name = "AuditContentError";
  }
}

export function isAuditCode(value: string): boolean {
  return CODE.test(value);
}

/** Een tekst uit een variabele als code. Gooit bij alles wat op vrije tekst lijkt. */
export function auditCode(value: string, where = "een waarde"): AuditCode {
  if (!CODE.test(value)) throw new AuditContentError(where, value.length);
  return value as AuditCode;
}

export function auditCodes(values: readonly string[], where = "een lijst"): readonly AuditCode[] {
  return values.map((value) => auditCode(value, where));
}

/** Dat er tekst was en hoe lang: het enige wat van vrije tekst in het logboek komt. */
export function auditLength(text: string | null | undefined): number {
  return (text ?? "").length;
}

type FlatValue = string | number | boolean | null | undefined | Date | readonly string[];

/**
 * Een platte rij als feiten: elke tekst wordt getoetst als code, een datum wordt zijn ISO-vorm. Voor
 * een rij met instellingen, waar elke kolom een sleutel, een getal of een schakelaar is. Zit er een
 * kolom met vrije tekst in, dan gooit dit, en dat hoort zo: laat die kolom weg of geef zijn lengte.
 */
export function auditFacts<T extends { readonly [K in keyof T]: FlatValue }>(row: T): AuditFacts {
  const facts: Record<string, AuditValue> = {};
  for (const [key, value] of Object.entries(row as Readonly<Record<string, FlatValue>>)) {
    if (value === undefined) continue;
    if (typeof value === "string") facts[key] = auditCode(value, key);
    else if (value instanceof Date) facts[key] = auditCode(value.toISOString(), key);
    else if (Array.isArray(value)) facts[key] = auditCodes(value as readonly string[], key);
    else facts[key] = value as number | boolean | null;
  }
  return facts;
}

/**
 * De laatste controle voor het schrijven. Ook wie het type omzeilt met een cast, krijgt geen zin het
 * logboek in. Hoogstens vijf lagen diep: een feit is plat, geen document.
 */
export function assertAuditFacts(value: unknown, where: string, depth = 0): void {
  if (value === null || value === undefined || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new AuditContentError(where, 0);
    return;
  }
  if (typeof value === "string") {
    if (!CODE.test(value)) throw new AuditContentError(where, value.length);
    return;
  }
  if (depth >= 5 || typeof value !== "object" || value instanceof Date) throw new AuditContentError(where, 0);
  if (Array.isArray(value)) {
    for (const item of value) assertAuditFacts(item, where, depth + 1);
    return;
  }
  for (const [key, item] of Object.entries(value)) assertAuditFacts(item, `${where}.${key}`, depth + 1);
}
