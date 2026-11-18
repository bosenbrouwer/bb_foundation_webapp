/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { STATIC_CSP_SOURCE, withTemplateDefaults } from "../config/next-base";
import { STATIC_CSP, STATIC_FILE_EXTENSIONS } from "./csp";

/**
 * Welk pad krijgt welke CSP (besluit D17). De matcher van `proxy.ts` is een letterlijke tekst die
 * Next bij het bouwen leest; deze test leest hem uit het bestand, zodat hij niet stil kan afwijken
 * van `STATIC_FILE_EXTENSIONS` en zodat een pagina met een punt in het adres nooit meer buiten de
 * proxy valt.
 */
const proxyText = readFileSync(fileURLToPath(new URL("../../proxy.ts", import.meta.url)), "utf8");
const source = /source: "(\/\(\(\?!.*)",\r?\n/.exec(proxyText)?.[1] ?? "";
/* In het bestand staat de tekst van een string: twee backslashes zijn er één. */
const matcher = new RegExp(`^${source.replaceAll("\\\\", "\\")}$`);
const covered = (path: string): boolean => matcher.test(path);

describe("de matcher van de proxy", () => {
  it("is uit proxy.ts te lezen", () => {
    expect(source).toContain("(?!api/|_next/static|_next/image|");
  });

  it("noemt precies de extensies uit STATIC_FILE_EXTENSIONS", () => {
    expect(source).toContain(`\\\\.(?:${STATIC_FILE_EXTENSIONS.join("|")})$`);
  });

  it("geeft elke pagina de nonce, ook met een punt in het adres", () => {
    for (const path of ["/", "/home", "/sign-in", "/admin/users", "/iets.x", "/bestaat-niet.php", "/mensen/jan.jansen", "/v1.2/notities", "/rapport.2026", "/admin/users/a.b/edit"]) {
      expect(covered(path), path).toBe(true);
    }
  });

  it("slaat alleen over wat geen pagina kan zijn", () => {
    for (const path of ["/api/cron/prune", "/api/auth/error", "/_next/static/chunks/main.js", "/_next/image", "/robots.txt", "/favicon.ico", "/brand/logo.svg", "/fonts/eigen.woff2"]) {
      expect(covered(path), path).toBe(false);
    }
  });
});

describe("de vaste CSP voor wat buiten de proxy valt", () => {
  it("staat op de pagina's van Auth.js, en nergens anders als tweede header", async () => {
    const rules = (await withTemplateDefaults().headers?.()) ?? [];
    const withCsp = rules.filter((rule) => rule.headers.some((header) => header.key.toLowerCase() === "content-security-policy"));
    expect(withCsp.map((rule) => rule.source)).toEqual([STATIC_CSP_SOURCE]);
    expect(withCsp[0]?.headers).toEqual([{ key: "Content-Security-Policy", value: STATIC_CSP }]);
    /* De proxy slaat dat pad over, dus er komt geen tweede CSP bij. */
    expect(covered("/api/auth/error")).toBe(false);
  });

  it("laat geen enkel script toe", () => {
    expect(STATIC_CSP).toContain("default-src 'none'");
    expect(STATIC_CSP).not.toContain("script-src");
    expect(STATIC_CSP).toContain("frame-ancestors 'none'");
    expect(STATIC_CSP).toContain("form-action 'self'");
  });
});
