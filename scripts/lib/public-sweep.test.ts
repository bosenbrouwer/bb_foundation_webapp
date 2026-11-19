/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { concretePath, judgeCron, judgeGate, judgeInside, locationPath, SAMPLE_ID, targetsFromManifest, type Target } from "./public-sweep";

const LIST = ["/sign-in", "/api/auth", "/api/cron"];
const isPublic = (path: string): boolean => LIST.some((entry) => path === entry || path.startsWith(`${entry}/`));

describe("de adressen uit de build", () => {
  const manifest = {
    "/(app)/admin/users/[id]/page": "/admin/users/[id]",
    "/(app)/home/page": "/home",
    "/_global-error/page": "/_global-error",
    "/_not-found/page": "/_not-found",
    "/api/auth/[...nextauth]/route": "/api/auth/[...nextauth]",
    "/api/cron/prune/route": "/api/cron/prune",
    "/api/files/[id]/route": "/api/files/[id]",
    "/icon.png/route": "/icon.png",
    "/page": "/",
    "/sign-in/page": "/sign-in",
  };

  it("zijn de pagina's en routes, zonder die van het framework en zonder metadatabestanden", () => {
    const targets = targetsFromManifest(manifest, isPublic);
    expect(targets.map((target) => target.path)).toEqual(["/", `/admin/users/${SAMPLE_ID}`, "/api/auth/x", "/api/cron/prune", `/api/files/${SAMPLE_ID}`, "/home", "/sign-in"]);
  });

  it("weten per adres of het een pagina of een route is, en of het op de lijst staat", () => {
    const byPath = new Map(targetsFromManifest(manifest, isPublic).map((target) => [target.path, target]));
    expect(byPath.get("/home")).toMatchObject({ kind: "page", open: false });
    expect(byPath.get("/sign-in")).toMatchObject({ kind: "page", open: true });
    expect(byPath.get(`/api/files/${SAMPLE_ID}`)).toMatchObject({ kind: "route", open: false, route: "/api/files/[id]" });
    expect(byPath.get("/api/cron/prune")).toMatchObject({ kind: "route", open: true });
  });

  it("vullen elk dynamisch stuk met een waarde", () => {
    expect(concretePath("/a/[id]/b/[other]")).toBe(`/a/${SAMPLE_ID}/b/${SAMPLE_ID}`);
    expect(concretePath("/docs/[...slug]")).toBe("/docs/x");
    expect(concretePath("/docs/[[...slug]]")).toBe("/docs/x");
    expect(concretePath("/")).toBe("/");
  });
});

describe("waar een doorverwijzing heen wijst", () => {
  it("is een pad op het eigen adres, en anders extern", () => {
    expect(locationPath("/sign-in", "http://127.0.0.1:3000")).toBe("/sign-in");
    expect(locationPath("http://127.0.0.1:3000/sign-in?x=1", "http://127.0.0.1:3000")).toBe("/sign-in");
    expect(locationPath("https://elders.example/sign-in", "http://127.0.0.1:3000")).toBe("external");
    expect(locationPath("//elders.example/sign-in", "http://127.0.0.1:3000")).toBe("external");
    expect(locationPath(null, "http://127.0.0.1:3000")).toBeNull();
  });
});

describe("het oordeel over de poort", () => {
  const page: Target = { route: "/home", path: "/home", kind: "page", open: false };
  const route: Target = { route: "/api/files/[id]", path: `/api/files/${SAMPLE_ID}`, kind: "route", open: false };

  it("eist voor een pagina de inlog, en niets anders", () => {
    expect(judgeGate(page, { status: 307, location: "/sign-in" }, "/sign-in")).toBeUndefined();
    expect(judgeGate(page, { status: 307, location: "/home" }, "/sign-in")).toContain("niet de inlog");
    expect(judgeGate(page, { status: 200, location: null }, "/sign-in")).toContain("200");
    expect(judgeGate(page, { status: 404, location: null }, "/sign-in")).toContain("404");
    expect(judgeGate(page, { status: 307, location: "external" }, "/sign-in")).toContain("niet de inlog");
  });

  it("eist voor een route een 401", () => {
    expect(judgeGate(route, { status: 401, location: null }, "/sign-in")).toBeUndefined();
    expect(judgeGate(route, { status: 404, location: null }, "/sign-in")).toContain("geen 401");
    expect(judgeGate(route, { status: 200, location: null }, "/sign-in")).toContain("geen 401");
  });
});

describe("het oordeel voorbij de poort", () => {
  it("keurt goed wat op de inlog eindigt, ook over twee stappen", () => {
    expect(judgeInside([{ status: 307, location: "/sign-in" }, { status: 200, location: null }], isPublic)).toBeUndefined();
    expect(judgeInside([{ status: 307, location: "/home" }, { status: 307, location: "/sign-in" }, { status: 200, location: null }], isPublic)).toBeUndefined();
  });

  it("keurt een weigering goed", () => {
    for (const status of [401, 403, 404, 405]) expect(judgeInside([{ status, location: null }], isPublic)).toBeUndefined();
  });

  it("keurt een antwoord met inhoud af, ook na een doorverwijzing naar een afgeschermde pagina", () => {
    expect(judgeInside([{ status: 200, location: null }], isPublic)).toContain("200 zonder geldige sessie");
    expect(judgeInside([{ status: 307, location: "/home" }, { status: 200, location: null }], isPublic)).toContain("200 zonder geldige sessie");
    expect(judgeInside([{ status: 204, location: null }], isPublic)).toContain("204");
  });

  it("keurt een 500 af, met wat dat betekent", () => {
    expect(judgeInside([{ status: 500, location: null }], isPublic)).toContain("voordat hij de sessie controleert");
    expect(judgeInside([{ status: 307, location: "/sign-in" }, { status: 500, location: null }], isPublic)).toContain("500");
  });

  it("keurt af wat blijft doorsturen, het adres verlaat of niets teruggeeft", () => {
    expect(judgeInside([{ status: 307, location: "/a" }, { status: 307, location: "/b" }], isPublic)).toContain("blijft doorsturen");
    expect(judgeInside([{ status: 307, location: "external" }, { status: 200, location: null }], isPublic)).toContain("ander adres");
    expect(judgeInside([], isPublic)).toBe("geen antwoord");
  });
});

describe("het oordeel over een cronroute zonder token", () => {
  it("eist een 404", () => {
    expect(judgeCron({ status: 404, location: null })).toBeUndefined();
    expect(judgeCron({ status: 200, location: null })).toContain("geen 404");
    expect(judgeCron({ status: 500, location: null })).toContain("geen 404");
    expect(judgeCron({ status: 401, location: null })).toContain("geen 404");
  });
});
