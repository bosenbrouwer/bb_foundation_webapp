/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { STATIC_CSP_SOURCE, withTemplateDefaults } from "../config/next-base";
import { STATIC_CSP, STATIC_FILE_EXTENSIONS, wantsNonce } from "./csp";

/**
 * Welk pad komt langs de proxy, en welk pad krijgt welke CSP (besluiten D17 en D24). De matcher van
 * `proxy.ts` is een letterlijke tekst die Next bij het bouwen leest; deze test leest hem uit het
 * bestand, zodat hij niet stil kan afwijken van `STATIC_FILE_EXTENSIONS`, zodat een pagina met een
 * punt in het adres nooit meer buiten de proxy valt, en zodat niemand er een uitzondering in zet
 * waarlangs een verzoek de poort van de inlog overslaat.
 */
const proxyText = readFileSync(fileURLToPath(new URL("../../proxy.ts", import.meta.url)), "utf8");
const source = /^\s*"(\/\(\(\?!.*)",\r?$/m.exec(proxyText)?.[1] ?? "";
/* In het bestand staat de tekst van een string: twee backslashes zijn er één. */
const matcher = new RegExp(`^${source.replaceAll("\\\\", "\\")}$`);
const covered = (path: string): boolean => matcher.test(path);

describe("de matcher van de proxy", () => {
  it("is uit proxy.ts te lezen", () => {
    expect(source).toContain("(?!_next/static|_next/image|");
  });

  it("noemt precies de extensies uit STATIC_FILE_EXTENSIONS", () => {
    expect(source).toContain(`\\\\.(?:${STATIC_FILE_EXTENSIONS.join("|")})$`);
  });

  it("laat elke pagina langs de proxy komen, ook met een punt in het adres", () => {
    for (const path of ["/", "/home", "/sign-in", "/admin/users", "/iets.x", "/bestaat-niet.php", "/mensen/jan.jansen", "/v1.2/notities", "/rapport.2026", "/admin/users/a.b/edit"]) {
      expect(covered(path), path).toBe(true);
      expect(wantsNonce(path, false), path).toBe(true);
    }
  });

  it("laat ook elke route onder /api langs de poort komen, zonder nonce", () => {
    for (const path of ["/api/cron/prune", "/api/auth/error", "/api/files/1", "/api/bestaat-niet"]) {
      expect(covered(path), path).toBe(true);
      expect(wantsNonce(path, false), path).toBe(false);
    }
  });

  it("slaat alleen over wat geen pagina en geen route kan zijn", () => {
    for (const path of ["/_next/static/chunks/main.js", "/_next/image", "/robots.txt", "/.well-known/security.txt", "/favicon.ico", "/brand/logo.svg", "/fonts/eigen.woff2"]) {
      expect(covered(path), path).toBe(false);
    }
  });

  it("kent geen uitzondering op een kop van het verzoek: een prefetch komt langs de poort", () => {
    /* Stond er `missing` met de koppen van een prefetch in de matcher, dan sloeg een verzoek dat die kop zelf meestuurt de hele proxy over. */
    const config = proxyText.slice(proxyText.indexOf("export const config"));
    expect(config).not.toMatch(/\bmissing\s*:/);
    expect(config).not.toMatch(/\bhas\s*:/);
  });
});

describe("de vaste CSP voor wat geen nonce krijgt", () => {
  it("staat op de pagina's van Auth.js, en nergens anders als tweede header", async () => {
    const rules = (await withTemplateDefaults().headers?.()) ?? [];
    const withCsp = rules.filter((rule) => rule.headers.some((header) => header.key.toLowerCase() === "content-security-policy"));
    expect(withCsp.map((rule) => rule.source)).toEqual([STATIC_CSP_SOURCE]);
    expect(withCsp[0]?.headers).toEqual([{ key: "Content-Security-Policy", value: STATIC_CSP }]);
    /* De proxy zet daar geen nonce, dus er komt geen tweede CSP bij. */
    expect(wantsNonce("/api/auth/error", false)).toBe(false);
  });

  it("laat geen enkel script toe", () => {
    expect(STATIC_CSP).toContain("default-src 'none'");
    expect(STATIC_CSP).not.toContain("script-src");
    expect(STATIC_CSP).toContain("frame-ancestors 'none'");
    expect(STATIC_CSP).toContain("form-action 'self'");
  });
});
