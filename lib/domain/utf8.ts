/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Bytes strikt als UTF-8 lezen, of weigeren.
 *
 * De standaardfunctie van de browser en de server vervangt elke byte die geen UTF-8 is stil door een
 * vraagteken in een ruit. In een eerder project zette een CSV uit Excel in een oudere codering zo een
 * naam met een ü kapot, zonder melding, en het origineel werd niet bewaard. Raad de codering daarom
 * niet: weiger het bestand en zeg hoe iemand het goed opslaat (in Excel: "CSV UTF-8").
 *
 * Een byte order mark vooraan gaat eraf; die zet Excel bij "CSV UTF-8" zelf neer.
 */
export type Utf8Result = { readonly ok: true; readonly text: string } | { readonly ok: false };

export function decodeUtf8Strict(bytes: Uint8Array | ArrayBuffer): Utf8Result {
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false };
  }
}
