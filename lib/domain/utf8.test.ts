/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { decodeUtf8Strict } from "./utf8";

describe("bytes strikt als UTF-8", () => {
  it("leest gewone tekst en tekst met accenten", () => {
    expect(decodeUtf8Strict(new TextEncoder().encode("naam;plaats\nMüller;Zürich"))).toEqual({ ok: true, text: "naam;plaats\nMüller;Zürich" });
  });

  it("weigert een bestand in een oudere codering, in plaats van de letter stil te vervangen", () => {
    /* "Müller" zoals Excel het in Windows-1252 opslaat: de ü is één byte, 0xFC. */
    const windows1252 = Uint8Array.from([0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72]);
    expect(decodeUtf8Strict(windows1252)).toEqual({ ok: false });
  });

  it("weigert een afgebroken teken aan het eind", () => {
    expect(decodeUtf8Strict(Uint8Array.from([0x61, 0xc3]))).toEqual({ ok: false });
  });

  it("haalt een byte order mark vooraan weg", () => {
    expect(decodeUtf8Strict(Uint8Array.from([0xef, 0xbb, 0xbf, 0x61, 0x62]))).toEqual({ ok: true, text: "ab" });
  });

  it("leest een leeg bestand als lege tekst, en neemt ook een ArrayBuffer aan", () => {
    expect(decodeUtf8Strict(new Uint8Array())).toEqual({ ok: true, text: "" });
    expect(decodeUtf8Strict(new TextEncoder().encode("ok").buffer as ArrayBuffer)).toEqual({ ok: true, text: "ok" });
  });
});
