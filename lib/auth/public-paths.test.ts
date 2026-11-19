/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { SIGN_IN_PATH } from "./paths";
import { gateVerdict, hasSessionCookie, isPublicPath, proxyGateOff, PUBLIC_PATHS, TEMPLATE_PUBLIC_PATHS } from "./public-paths";

describe("de lijst van openbare adressen", () => {
  it("is kort en vast: de inlog, de inlogbibliotheek en de cronroutes", () => {
    expect(TEMPLATE_PUBLIC_PATHS).toEqual(["/sign-in", "/api/auth", "/api/cron"]);
    expect(TEMPLATE_PUBLIC_PATHS[0]).toBe(SIGN_IN_PATH);
    expect(PUBLIC_PATHS.slice(0, TEMPLATE_PUBLIC_PATHS.length)).toEqual(TEMPLATE_PUBLIC_PATHS);
  });

  it("laat een pad door dat erop staat of eronder hangt", () => {
    for (const path of ["/sign-in", "/sign-in/reset", "/sign-in/invite/abc", "/api/auth/session", "/api/cron/prune"]) expect(isPublicPath(path)).toBe(true);
  });

  it("telt alleen op de grens van een padstuk, en niet op wat erop lijkt", () => {
    for (const path of ["/", "/home", "/sign-in-2", "/sign-inner/x", "/api", "/api/authx", "/api/files/1", "/admin/sign-in", "/SIGN-IN"]) expect(isPublicPath(path)).toBe(false);
  });
});

describe("de sessiecookie", () => {
  it("herkent de cookie van de inlogbibliotheek, ook beveiligd en in stukken", () => {
    for (const name of ["authjs.session-token", "__Secure-authjs.session-token", "__Host-authjs.session-token", "__Secure-authjs.session-token.0", "authjs.session-token.12"]) expect(hasSessionCookie([name])).toBe(true);
  });

  it("ziet een andere cookie niet aan voor een sessie", () => {
    expect(hasSessionCookie([])).toBe(false);
    expect(hasSessionCookie(["authjs.csrf-token", "authjs.callback-url", "session-token", "xauthjs.session-token", "authjs.session-token.x"])).toBe(false);
  });
});

describe("de poort van de proxy", () => {
  it("stuurt zonder cookie alles buiten de lijst naar de inlog, ook een pad dat niet bestaat", () => {
    for (const path of ["/", "/home", "/admin/system", "/bestaat-niet", "/rapport.csv"]) expect(gateVerdict(path, [])).toBe("sign-in");
  });

  it("laat de lijst door zonder cookie, en alles met een cookie", () => {
    expect(gateVerdict("/sign-in", [])).toBe("pass");
    expect(gateVerdict("/api/auth/callback/x", [])).toBe("pass");
    expect(gateVerdict("/home", ["__Secure-authjs.session-token"])).toBe("pass");
  });

  it("geeft een route onder /api zonder cookie een 401, ook een die niet bestaat, en laat de lijst door", () => {
    for (const path of ["/api", "/api/files/1", "/api/export", "/api/bestaat-niet", "/api/authx/session"]) expect(gateVerdict(path, [])).toBe("unauthorized");
    for (const path of ["/api/auth/session", "/api/cron/prune"]) expect(gateVerdict(path, [])).toBe("pass");
    expect(gateVerdict("/api/files/1", ["authjs.session-token"])).toBe("pass");
    /* Alleen het echte padstuk telt: wat erop lijkt, is een pagina en gaat naar de inlog. */
    for (const path of ["/apis", "/API/files/1", "/admin/api/x"]) expect(gateVerdict(path, [])).toBe("sign-in");
  });

  it("laat door wat het framework zelf uitdeelt, en niets dat daarop lijkt", () => {
    for (const path of ["/_next/static/chunks/main.js", "/_next/webpack-hmr", "/__nextjs_original-stack-frames"]) expect(gateVerdict(path, [])).toBe("pass");
    for (const path of ["/_next", "/_nextx/y", "/home/_next/x"]) expect(gateVerdict(path, [])).toBe("sign-in");
  });

  it("kent de adressen van het project, als die er zijn", () => {
    expect(gateVerdict("/privacy", [], ["/sign-in", "/privacy"])).toBe("pass");
    expect(gateVerdict("/privacy/nl", [], ["/sign-in", "/privacy"])).toBe("pass");
    expect(gateVerdict("/privacybeleid", [], ["/sign-in", "/privacy"])).toBe("sign-in");
  });
});

describe("de schakelaar van de poort", () => {
  it("staat alleen uit in een uitdrukkelijk lokale omgeving", () => {
    expect(proxyGateOff({ PROXY_GATE: "off", APP_ENV: "local" })).toBe(true);
  });

  it("doet niets op een preview, op productie of als de omgeving onbekend is", () => {
    expect(proxyGateOff({ PROXY_GATE: "off" })).toBe(false);
    expect(proxyGateOff({ PROXY_GATE: "off", APP_ENV: "local", VERCEL_ENV: "production" })).toBe(false);
    expect(proxyGateOff({ PROXY_GATE: "off", APP_ENV: "local", VERCEL_ENV: "preview" })).toBe(false);
    expect(proxyGateOff({ PROXY_GATE: "off", VERCEL_ENV: "production" })).toBe(false);
  });

  it("staat aan zonder de variabele, of met een andere waarde", () => {
    expect(proxyGateOff({ APP_ENV: "local" })).toBe(false);
    expect(proxyGateOff({ PROXY_GATE: "1", APP_ENV: "local" })).toBe(false);
  });
});
