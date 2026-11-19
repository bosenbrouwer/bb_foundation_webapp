/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Vrije tekst met een maximum: weigeren, niet afkappen.
 *
 * Elk vrij tekstveld heeft een grens. In een eerder project kwam een toelichting van vier megabyte in
 * een overzicht, een export, het logboek en later op een factuurregel terecht. Afkappen lijkt
 * vriendelijk maar gooit stil weg wat iemand typte; weigeren zegt het, met het maximum erbij, en de
 * tekst staat nog in het veld.
 *
 * Gebruik dit in de server action, na `requireSession()`. Zet daarnaast een `check` op de kolom in
 * de database (`char_length(...) <= ...`): de action is de vriendelijke grens, de database de harde.
 */
export type LimitedText =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly reason: "required" | "tooLong"; readonly max: number };

export interface TextLimit {
  /** Het maximum in tekens, na het weghalen van witruimte aan de randen. */
  readonly max: number;
  /** Mag het veld leeg zijn? Standaard niet. */
  readonly optional?: boolean;
}

export function limitedText(input: unknown, limit: TextLimit): LimitedText {
  const value = typeof input === "string" ? input.trim() : "";
  if (value === "") return limit.optional === true ? { ok: true, value: "" } : { ok: false, reason: "required", max: limit.max };
  /* Tekens tellen zoals een mens ze ziet: een teken buiten het basisvlak is er één, geen twee. */
  if ([...value].length > limit.max) return { ok: false, reason: "tooLong", max: limit.max };
  return { ok: true, value };
}
