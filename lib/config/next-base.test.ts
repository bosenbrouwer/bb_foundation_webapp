/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { NOINDEX_HEADER, NOINDEX_SOURCE, STATIC_CSP_SOURCE, TEMPLATE_HEADERS, withTemplateDefaults } from "./next-base";

const value = (key: string) => TEMPLATE_HEADERS.find((header) => header.key === key)?.value;

describe("de vaste koppen op elk antwoord", () => {
  it("zijn precies deze zes, met deze waarden", () => {
    expect(TEMPLATE_HEADERS.map((header) => header.key)).toEqual(["X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "Strict-Transport-Security", "Cross-Origin-Opener-Policy"]);
    expect(value("X-Frame-Options")).toBe("DENY");
    expect(value("X-Content-Type-Options")).toBe("nosniff");
    expect(value("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(value("Cross-Origin-Opener-Policy")).toBe("same-origin");
  });

  it("houden camera, microfoon en locatie uit", () => {
    for (const feature of ["camera=()", "microphone=()", "geolocation=()"]) expect(value("Permissions-Policy")).toContain(feature);
  });

  it("eisen twee jaar een versleutelde verbinding, ook op subdomeinen", () => {
    const hsts = value("Strict-Transport-Security") ?? "";
    expect(Number(/max-age=(\d+)/.exec(hsts)?.[1])).toBeGreaterThanOrEqual(2 * 365 * 24 * 60 * 60);
    expect(hsts).toContain("includeSubDomains");
  });

  it("staan op elk pad, en de kop die het framework noemt staat uit", async () => {
    const config = withTemplateDefaults();
    const rules = (await config.headers?.()) ?? [];
    expect(rules.find((rule) => rule.source === "/(.*)")?.headers).toEqual(TEMPLATE_HEADERS);
    expect(rules.some((rule) => rule.source === STATIC_CSP_SOURCE)).toBe(true);
    expect(config.poweredByHeader).toBe(false);
  });

  it("laten de koppen van het project erachter staan", async () => {
    const config = withTemplateDefaults({ headers: async () => [{ source: "/eigen", headers: [{ key: "X-Eigen", value: "1" }] }] });
    const rules = (await config.headers?.()) ?? [];
    expect(rules.at(-1)).toEqual({ source: "/eigen", headers: [{ key: "X-Eigen", value: "1" }] });
  });
});

describe("niet in een zoekmachine, behalve de ingang", () => {
  /* De bron is een patroon van Next: een pad met een regex-groep. Hier als gewone regex nagebouwd. */
  const noindex = new RegExp(`^${NOINDEX_SOURCE}$`);

  it("vraagt op elk pad om niet opgenomen te worden", async () => {
    expect(NOINDEX_HEADER).toEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" });
    const rules = (await withTemplateDefaults().headers?.()) ?? [];
    expect(rules.find((rule) => rule.source === NOINDEX_SOURCE)?.headers).toEqual([NOINDEX_HEADER]);
    for (const path of ["/", "/home", "/admin/system", "/sign-in/reset", "/sign-in/invite/abc", "/sign-inner", "/api/auth/session"]) expect(noindex.test(path), path).toBe(true);
  });

  it("behalve op het inlogscherm zelf", () => {
    expect(noindex.test("/sign-in")).toBe(false);
  });
});
