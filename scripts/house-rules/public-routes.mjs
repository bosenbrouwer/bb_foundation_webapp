/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: niets is zonder sessie bereikbaar, behalve wat op de lijst van openbare adressen staat.
 *
 * **Waarom.** Een openbare route is een aanvalsvlak. Zet iemand een pagina buiten `app/(app)/`, dan
 * beschermt de layout van dat deel hem niet, en zonder deze regel ziet geen controle dat. Met één
 * lijst (`lib/auth/public-paths.ts` van het template, `public-paths.project.ts` van het project) is
 * "is dit expres openbaar" een vraag met een antwoord.
 *
 * **Wat hij bekijkt.**
 * - Elke `page.tsx` onder `app/`. Onder `app/(app)/` is hij afgeschermd door de layout. Daarbuiten
 *   moet zijn adres op de lijst staan, of de pagina moet zelf `requireSession()` aanroepen. De
 *   startpagina die alleen doorstuurt, mag.
 * - Elke `route.ts` onder `app/`. Zijn adres staat op de lijst, of hij heeft zelf een poort:
 *   `requireSession()`, `requireActor()`, `currentActor()` of `requireCron()`.
 *
 * Dit is de controle bij de build. `proxy.ts` gebruikt dezelfde lijst bij elk verzoek, en
 * `pnpm check:public` gaat elke route langs tegen de gebouwde app.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { collectFiles } from "./files.mjs";

const ROUTE_FILE = /^(?:template\/modules\/[^/]+\/files\/)?app\/(?:(.*)\/)?(page\.tsx|route\.ts)$/;
const GUARD = /\b(?:requireSession|requireActor|currentActor|requireCron)\s*\(/;

/** De teksten tussen aanhalingstekens in de lijst met deze naam. */
export function pathsIn(text, name) {
  const block = new RegExp(`${name}[^=]*=\\s*\\[([^\\]]*)\\]`).exec(text);
  return block === null ? [] : [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

export function readPublicPaths(root) {
  const read = (rel) => (existsSync(join(root, rel)) ? readFileSync(join(root, rel), "utf8") : "");
  return [...pathsIn(read("lib/auth/public-paths.ts"), "TEMPLATE_PUBLIC_PATHS"), ...pathsIn(read("lib/auth/public-paths.project.ts"), "PROJECT_PUBLIC_PATHS")];
}

/** Het adres van een pagina of route, en of hij onder het afgeschermde deel staat. Null als dit geen van beide is. */
export function routeOf(rel) {
  const match = ROUTE_FILE.exec(rel);
  if (match === null) return null;
  const dirs = (match[1] ?? "").split("/").filter((part) => part !== "");
  return {
    kind: match[2] === "page.tsx" ? "page" : "route",
    behindSession: dirs.includes("(app)"),
    path: `/${dirs.filter((part) => !/^\(.*\)$/.test(part)).join("/")}`,
  };
}

export function isListed(path, list) {
  return list.some((entry) => path === entry || path.startsWith(`${entry}/`));
}

/** Eén bestand tegen de lijst. Los te testen. */
export function publicRoutesRule(list) {
  return function checkPublicRoute(rel, text, report) {
    const route = routeOf(rel);
    if (route === null || route.behindSession || isListed(route.path, list)) return;
    const code = text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
    if (GUARD.test(code)) return;
    if (route.kind === "page") {
      /* De startpagina die alleen doorstuurt, toont niets en hoeft dus niet op de lijst. */
      if (route.path === "/" && /\bredirect\s*\(/.test(code) && !/<[A-Za-z]/.test(code)) return;
      report(`${rel} is een pagina buiten app/(app)/ die niet op de lijst van openbare adressen staat en niet zelf met requireSession() begint. Zet hem onder app/(app)/, of zet het pad ${route.path} bewust in lib/auth/public-paths.project.ts.`);
    } else {
      report(`${rel} is een route zonder poort: het pad ${route.path} staat niet op de lijst van openbare adressen en de route roept geen requireSession(), requireActor() of requireCron() aan.`);
    }
  };
}

export async function checkPublicRoutes(root, report) {
  const rule = publicRoutesRule(readPublicPaths(root));
  for (const rel of await collectFiles(root)) {
    if (routeOf(rel) === null) continue;
    rule(rel, readFileSync(join(root, rel), "utf8"), report);
  }
}
