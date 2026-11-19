/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm check:public`: elke pagina en route uit de build, opgevraagd zonder sessie.
 *
 * **Wat het bewijst.** Twee ringen, elk apart (besluit D24):
 *
 * 1. **De poort van de proxy.** Zonder cookie wordt elke pagina buiten de lijst van openbare
 *    adressen (`lib/auth/public-paths.ts`) de inlog en elke route onder `/api` een 401, ook een
 *    adres dat niet bestaat, ook met de kop van een prefetch en ook een verzoek dat een server
 *    action wil aanroepen.
 * 2. **De binnenkant, zonder de poort.** Dezelfde adressen nog twee keer: met een waardeloze cookie
 *    die de poort wel doorlaat (de poort kijkt alleen of er een cookie is), en met de poort uit
 *    (`PROXY_GATE=off`, werkt alleen lokaal). Elke pagina en route moet dan zelf weigeren: eindigen
 *    op de inlog, of een 401, 403, 404 of 405 geven. Nooit een 200, nooit een 500.
 *
 * Daarbij: elke cronroute geeft zonder token een kale 404.
 *
 * **Zonder database en zonder geheimen.** De server start met een lege databaseverbinding en met
 * geheimen die dit script zelf verzint. Een pagina die zonder sessie toch de database raakt, valt
 * daardoor om en is een bevinding. Er is geen `.env.local` nodig, dus dit draait ook in de CI,
 * direct na de build.
 *
 * **Wat het niet bewijst.** Server actions voorbij de poort: die controleert de huisregel
 * `session-first` in de bron. En wat iemand mét een geldige sessie mag: dat is `can()`, en dat
 * bewijzen de e2e en de `check:<domein>`.
 *
 * Draai eerst `pnpm build`: de ronde gaat tegen de build die er staat.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { SIGN_IN_PATH } from "../lib/auth/paths";
import { isPublicPath, PROXY_GATE_ENV, PUBLIC_PATHS } from "../lib/auth/public-paths";
import { fetchWithTimeout } from "../lib/integrations/http";
import { judgeCron, judgeGate, judgeInside, locationPath, targetsFromManifest, type Seen, type Target } from "./lib/public-sweep";
import { runScript } from "./lib/run";
import { SAFE_SERVER_ENV } from "./lib/safe-server-env";

const TIMEOUT_MS = 20_000;
const START_TIMEOUT_MS = 90_000;
const MAX_HOPS = 6;

let passed = 0;
const failures: string[] = [];

function check(name: string, problem: string | undefined): void {
  if (problem === undefined) {
    passed += 1;
    return;
  }
  failures.push(`${name}: ${problem}`);
  console.log(`  FOUT  ${name}: ${problem}`);
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => {
        if (typeof address === "object" && address !== null) resolve(address.port);
        else reject(new Error("geen vrije poort gevonden"));
      });
    });
  });
}

interface Server {
  readonly base: string;
  stop(): Promise<void>;
  output(): string;
}

/** Start `next start` op een vrije poort, zonder database en met verzonnen geheimen. */
async function startServer(extra: Readonly<Record<string, string>>): Promise<Server> {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...SAFE_SERVER_ENV,
    /* Lokaal, en uitdrukkelijk geen deploy: alleen dan luistert de schakelaar van de poort. */
    APP_ENV: "local",
    VERCEL_ENV: "",
    AUTH_DEV_LOGIN: "",
    AUTH_URL: base,
    AUTH_TRUST_HOST: "true",
    /* Verzonnen per run: deze ronde heeft nooit een echte sessie of een echt token nodig. */
    AUTH_SECRET: randomBytes(32).toString("base64"),
    CRON_SECRET: randomBytes(32).toString("base64"),
    /* Leeg en niet weg, zodat Next ze niet alsnog uit .env.local vult: wie zonder sessie de database raakt, valt om. */
    DATABASE_URL: "",
    DATABASE_URL_UNPOOLED: "",
    DATABASE_URL_APP: "",
    ...extra,
  };

  let log = "";
  const child: ChildProcess = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", String(port), "--hostname", "127.0.0.1"], { env, stdio: ["ignore", "pipe", "pipe"], shell: false });
  child.stdout?.on("data", (chunk: Buffer) => (log += chunk.toString("utf8")));
  child.stderr?.on("data", (chunk: Buffer) => (log += chunk.toString("utf8")));
  let exited = false;
  child.once("exit", () => (exited = true));

  const stop = (): Promise<void> =>
    new Promise((resolve) => {
      if (exited) {
        resolve();
        return;
      }
      child.once("exit", () => resolve());
      child.kill();
    });

  const deadline = Date.now() + START_TIMEOUT_MS;
  for (;;) {
    if (exited) throw new Error(`de server stopte bij het starten:\n${log.slice(-2000)}`);
    try {
      /* Een bestand uit public/: komt niet langs de proxy, dus zegt alleen of de server luistert. */
      const response = await fetchWithTimeout(`${base}/robots.txt`, { redirect: "manual" }, 2_000);
      await response.arrayBuffer();
      break;
    } catch {
      if (Date.now() > deadline) {
        await stop();
        throw new Error(`de server luisterde niet binnen ${START_TIMEOUT_MS / 1000} seconden:\n${log.slice(-2000)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  return { base, stop, output: () => log };
}

interface Ask {
  readonly method?: "GET" | "POST";
  readonly headers?: Readonly<Record<string, string>>;
}

async function ask(base: string, path: string, options: Ask = {}): Promise<Seen> {
  const method = options.method ?? "GET";
  const response = await fetchWithTimeout(`${base}${path}`, { method, redirect: "manual", cache: "no-store", headers: { ...options.headers }, ...(method === "POST" ? { body: "[]" } : {}) }, TIMEOUT_MS);
  await response.arrayBuffer();
  return { status: response.status, location: locationPath(response.headers.get("location"), base) };
}

/** Het verzoek en elke doorverwijzing erna, met dezelfde koppen, tot het stilstaat. */
async function follow(base: string, path: string, options: Ask = {}): Promise<Seen[]> {
  const hops: Seen[] = [];
  let next = path;
  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    const seen = await ask(base, next, hop === 0 ? options : { headers: options.headers ?? {} });
    hops.push(seen);
    if (seen.status < 300 || seen.status >= 400 || seen.location === null || seen.location === "external") break;
    next = seen.location;
  }
  return hops;
}

/* Een waardeloze cookie onder beide namen: de poort ziet een sessiecookie, de inlogbibliotheek kan er niets mee. */
const FORGED = { cookie: "authjs.session-token=vervalst; __Secure-authjs.session-token=vervalst" };

async function sweepGate(base: string, closed: readonly Target[], canary: string): Promise<void> {
  console.log("\n1. De poort van de proxy, zonder cookie");
  const before = failures.length;
  check(`${canary} (bestaat niet)`, judgeGate({ route: canary, path: canary, kind: "page", open: false }, await ask(base, canary), SIGN_IN_PATH));
  check("/api/bestaat-niet", judgeGate({ route: "/api/bestaat-niet", path: "/api/bestaat-niet", kind: "route", open: false }, await ask(base, "/api/bestaat-niet"), SIGN_IN_PATH));
  for (const target of closed) {
    check(`GET ${target.path}`, judgeGate(target, await ask(base, target.path), SIGN_IN_PATH));
    if (target.kind === "page") {
      check(`GET ${target.path} met de kop van een prefetch`, judgeGate(target, await ask(base, target.path, { headers: { "next-router-prefetch": "1", purpose: "prefetch" } }), SIGN_IN_PATH));
      check(`POST ${target.path} als server action`, judgeGate(target, await ask(base, target.path, { method: "POST", headers: { "next-action": "0".repeat(40), "content-type": "text/plain;charset=UTF-8" } }), SIGN_IN_PATH));
    } else {
      check(`POST ${target.path}`, judgeGate(target, await ask(base, target.path, { method: "POST" }), SIGN_IN_PATH));
    }
  }
  if (failures.length === before) console.log(`  ok    ${closed.length} adressen, en twee die niet bestaan: elke pagina wordt de inlog, elke route een 401`);
}

async function sweepInside(base: string, closed: readonly Target[], title: string, headers: Readonly<Record<string, string>>): Promise<void> {
  console.log(`\n${title}`);
  const before = failures.length;
  const open = (path: string): boolean => isPublicPath(path);
  for (const target of closed) {
    check(`GET ${target.path}`, judgeInside(await follow(base, target.path, { headers }), open));
    if (target.kind === "route") check(`POST ${target.path}`, judgeInside(await follow(base, target.path, { method: "POST", headers }), open));
  }
  if (failures.length === before) console.log(`  ok    ${closed.length} adressen: elk eindigt op de inlog of weigert zelf`);
}

async function sweepCrons(base: string, crons: readonly Target[]): Promise<void> {
  console.log("\n3. De cronroutes zonder token");
  if (crons.length === 0) {
    console.log("  (geen cronroutes in de build)");
    return;
  }
  const before = failures.length;
  for (const target of crons) {
    check(`GET ${target.path}`, judgeCron(await ask(base, target.path)));
    check(`GET ${target.path} met een verkeerd token`, judgeCron(await ask(base, target.path, { headers: { authorization: "Bearer niet-het-geheim" } })));
  }
  if (failures.length === before) console.log(`  ok    ${crons.length} ${crons.length === 1 ? "route geeft" : "routes geven"} een 404`);
}

runScript(async () => {
  const manifestPath = join(process.cwd(), ".next", "app-path-routes-manifest.json");
  if (!existsSync(join(process.cwd(), ".next", "BUILD_ID")) || !existsSync(manifestPath)) throw new Error("er staat geen build: draai eerst pnpm build.");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, string>;
  const targets = targetsFromManifest(manifest, (path) => isPublicPath(path));
  const closed = targets.filter((target) => !target.open);
  const open = targets.filter((target) => target.open);
  const crons = open.filter((target) => target.path.startsWith("/api/cron/"));

  console.log(`De build kent ${targets.length} pagina's en routes: ${closed.length} achter de sessie, ${open.length} openbaar.`);
  console.log(`De lijst van openbare adressen: ${PUBLIC_PATHS.join(", ")}`);
  for (const target of open) console.log(`  openbaar  ${target.path}`);
  /* Een controle die op een lege lijst slaagt, is geen controle. */
  if (closed.length === 0) throw new Error("de build kent geen enkel adres achter de sessie; dat kan niet kloppen.");

  const canary = `/bestaat-niet-${randomBytes(4).toString("hex")}`;

  const gated = await startServer({});
  try {
    await sweepGate(gated.base, closed, canary);
    await sweepInside(gated.base, closed, "2. Voorbij de poort, met een waardeloze cookie", FORGED);
    await sweepCrons(gated.base, crons);

    /* De proxy doet ook zijn andere werk nog: het inlogscherm staat er, met een CSP die een nonce noemt. */
    const signIn = await fetchWithTimeout(`${gated.base}${SIGN_IN_PATH}`, { redirect: "manual" }, TIMEOUT_MS);
    await signIn.arrayBuffer();
    check("het inlogscherm staat, met een nonce in de CSP", signIn.status === 200 && /'nonce-[A-Za-z0-9+/=]+'/.test(signIn.headers.get("content-security-policy") ?? "") ? undefined : `status ${signIn.status}, CSP ${signIn.headers.get("content-security-policy") === null ? "ontbreekt" : "zonder nonce"}`);
  } finally {
    await gated.stop();
  }
  if (failures.length > 0) console.log(`\nDe server zei:\n${gated.output().slice(-3000)}`);

  const ungated = await startServer({ [PROXY_GATE_ENV]: "off" });
  try {
    /* Het bewijs dat de poort echt uit is: het adres dat niet bestaat is nu een gewone 404 en niet meer de inlog. */
    const canarySeen = await ask(ungated.base, canary);
    if (canarySeen.status !== 404) throw new Error(`de poort ging niet uit (${canary} gaf ${canarySeen.status}): de schakelaar ${PROXY_GATE_ENV} werkt alleen in een lokale omgeving.`);
    await sweepInside(ungated.base, closed, "4. De binnenkant, met de poort van de proxy uit", {});
  } finally {
    await ungated.stop();
  }

  console.log(`\n${passed} goed, ${failures.length} fout.`);
  if (failures.length > 0) {
    console.log("\nEen adres dat zonder sessie iets teruggeeft, staat bewust op de lijst (lib/auth/public-paths.project.ts) of begint met requireSession().");
    process.exitCode = 1;
  }
});
