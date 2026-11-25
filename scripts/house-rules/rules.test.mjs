/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { aiImportsRule } from "./ai-imports.mjs";
import { checkAiOutput } from "./ai-output.mjs";
import { checkClaudeSettings, settingsProblems } from "./claude-settings.mjs";
import { checkClientGraph } from "./client-graph.mjs";
import { checkNoEmDash } from "./no-em-dash.mjs";
import { checkSameId } from "./same-id.mjs";
import { checkSecretPatterns } from "./secret-patterns.mjs";
import { checkServerActions } from "./server-actions.mjs";
import { checkSessionFirst } from "./session-first.mjs";
import { checkLabelsSize } from "./labels-size.mjs";
import { checkNoConfigImport } from "./no-config-import.mjs";
import { templateOwnershipRule } from "./template-ownership.mjs";
import { checkRawHtml } from "./raw-html.mjs";
import { checkRawSql } from "./raw-sql.mjs";
import { checkCsvExport } from "./csv-export.mjs";
import { isListed, pathsIn, publicRoutesRule, routeOf } from "./public-routes.mjs";
import { organisationScopeRule, organisationTables } from "./organisation-scope.mjs";

function run(rule, rel, text) {
  const found = [];
  rule(rel, text, (message) => found.push(message));
  return found;
}

describe("no-em-dash", () => {
  it("vindt een em-dash en noemt de regel", () => {
    const dash = String.fromCodePoint(0x2014);
    expect(run(checkNoEmDash, "docs/x.md", `regel een\nregel ${dash} twee`)).toEqual([
      "docs/x.md:2 em-dash gevonden, gebruik een komma, dubbele punt, haakjes of een nieuwe zin",
    ]);
  });

  it("laat het gegenereerde Next-blok en een citaat van de regel met rust", () => {
    const dash = String.fromCodePoint(0x2014);
    const text = `<!-- BEGIN:nextjs-agent-rules -->\nbreaking ${dash} changes\n<!-- END:nextjs-agent-rules -->\nNooit em-dashes (${dash})`;
    expect(run(checkNoEmDash, "CLAUDE.md", text)).toEqual([]);
  });
});

describe("server-actions", () => {
  it("laat async functies en types door en weigert een constante", () => {
    const text = `"use server";\nexport async function save() {}\nexport type State = {};\nexport const X = 1;`;
    const found = run(checkServerActions, "app/actions.ts", text);
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("export const X = 1");
  });

  it("negeert bestanden zonder use server", () => {
    expect(run(checkServerActions, "lib/x.ts", "export const X = 1;")).toEqual([]);
  });
});

describe("session-first", () => {
  const header = '"use server";\nimport { requireActor } from "@/lib/auth/session";\n\n';

  it("laat een action door die met de sessie begint, met of zonder const, en voorbij commentaar en een returntype met accolades", () => {
    const text = [
      header,
      "export async function a(form: FormData): Promise<{ ok: boolean }> {\n  /* eerst wie */\n  const actor = await requireActor();\n  return { ok: true };\n}\n",
      "export async function b(): Promise<void> {\n  // niets\n  await requireSession();\n}\n",
      "export async function c(input: { id: string }) {\n  const { organisationId } = await requireActor(\"admin\");\n  return organisationId;\n}\n",
    ].join("\n");
    expect(run(checkSessionFirst, "app/actions.ts", text)).toEqual([]);
  });

  it("weigert een action die eerst naar de invoer kijkt, en noemt de naam", () => {
    const text = `${header}export async function save(form: FormData): Promise<void> {\n  const text = String(form.get("text") ?? "");\n  const actor = await requireActor();\n  void actor;\n  void text;\n}\n`;
    const found = run(checkSessionFirst, "app/actions.ts", text);
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("app/actions.ts:4 save begint niet met de sessie");
  });

  it("laat een bewust anonieme action door, maar alleen met een reden", () => {
    const anonymous = `${header}/** session-first: inloggen heeft nog geen sessie. */\nexport async function signInAction(form: FormData) {\n  await signIn(form);\n}\n`;
    expect(run(checkSessionFirst, "app/sign-in/actions.ts", anonymous)).toEqual([]);
    const withoutReason = `${header}// session-first:\nexport async function signInAction(form: FormData) {\n  await signIn(form);\n}\n`;
    expect(run(checkSessionFirst, "app/sign-in/actions.ts", withoutReason)).toHaveLength(1);
  });

  it("negeert bestanden zonder use server", () => {
    expect(run(checkSessionFirst, "lib/x.ts", "export async function x() {\n  return 1;\n}\n")).toEqual([]);
  });
});

describe("labels-size", () => {
  it("weigert een labelbestand boven de grens en laat tests met rust", () => {
    const big = Array.from({ length: 601 }, () => "x").join("\n");
    expect(run(checkLabelsSize, "lib/i18n/labels.ts", big)).toHaveLength(1);
    expect(run(checkLabelsSize, "lib/i18n/template/en.test.ts", big)).toEqual([]);
    expect(run(checkLabelsSize, "lib/i18n/domain/home.ts", "const a = 1;")).toEqual([]);
  });
});

describe("template-ownership", () => {
  const owned = "/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */\nexport const a = 1;";
  const generated = "/* template-generated (theme) uit project.config.json. Niet bewerken: pnpm template:generate schrijft hem opnieuw. */\n:root {}";
  const adopted = "/* template-adopted (module core). Van het project sinds template 0.1.0; pnpm template:update raakt dit bestand niet meer aan. */\nexport const a = 2;";
  const plain = "export const a = 3;";
  const lock = {
    files: {
      "lib/a.ts": { module: "core", class: "owned" },
      "app/theme.css": { module: "core", class: "generated" },
      "docs/SPEC.md": { module: "core", class: "seed" },
    },
    adopted: ["lib/b.ts"],
  };
  const rule = templateOwnershipRule(lock);

  it("eist de kop op een owned of generated bestand uit de lock", () => {
    expect(run(rule, "lib/a.ts", owned)).toEqual([]);
    expect(run(rule, "lib/a.ts", plain)).toHaveLength(1);
    expect(run(rule, "lib/a.ts", generated)[0]).toContain("staat in de lock als owned");
    expect(run(rule, "app/theme.css", generated)).toEqual([]);
    expect(run(rule, "app/theme.css", owned)[0]).toContain("staat in de lock als generated");
  });

  it("weigert een templatekop op een bestand dat niet in de lock staat, en laat seeds en overgenomen bestanden met rust", () => {
    expect(run(rule, "lib/c.ts", owned)[0]).toContain("staat niet in de lock");
    expect(run(rule, "lib/c.ts", plain)).toEqual([]);
    expect(run(rule, "docs/SPEC.md", "# Spec")).toEqual([]);
    expect(run(rule, "lib/b.ts", adopted)).toEqual([]);
    expect(run(rule, "lib/b.ts", owned)[0]).toContain("overgenomen door het project");
  });

  it("doet niets zonder lock, zonder commentaarvorm en onder template/modules/", () => {
    expect(run(templateOwnershipRule(null), "lib/c.ts", owned)).toEqual([]);
    expect(run(rule, "lib/c.json", owned)).toEqual([]);
    expect(run(rule, "template/modules/jobs/files/lib/jobs/queue.ts", "/* template-owned (module jobs). */")).toEqual([]);
  });
});

describe("no-config-import", () => {
  it("weigert een import van project.config.json in de app en niet in scripts", () => {
    const text = `import config from "../../project.config.json";`;
    expect(run(checkNoConfigImport, "lib/project/x.ts", text)).toHaveLength(1);
    expect(run(checkNoConfigImport, "scripts/x.ts", text)).toEqual([]);
  });
});

describe("same-id", () => {
  it("weigert === en !== tegen actor.id, aan beide kanten", () => {
    expect(run(checkSameId, "lib/a.ts", "if (userId === actor.id) return;")).toHaveLength(1);
    expect(run(checkSameId, "app/a.ts", "if (actor.id !== input.userId) return;")).toHaveLength(1);
    expect(run(checkSameId, "lib/a.ts", "const mine = row.ownerId === actor.id;")[0]).toContain("sameId()");
  });

  it("laat sameId, een vergelijking met een letterlijke tekst en tests met rust", () => {
    expect(run(checkSameId, "lib/a.ts", "if (sameId(userId, actor.id)) return;")).toEqual([]);
    expect(run(checkSameId, "lib/a.ts", 'const id = actor.id === "" ? null : actor.id;')).toEqual([]);
    expect(run(checkSameId, "lib/a.test.ts", "expect(userId === actor.id).toBe(true);")).toEqual([]);
    expect(run(checkSameId, "scripts/a.ts", "if (userId === actor.id) return;")).toEqual([]);
  });
});

describe("secret-patterns", () => {
  /* De nepgeheimen worden pas hier aan elkaar gezet: als letterlijke tekst zou dit bestand zelf vallen. */
  const sas = "https://acc.blob.core.windows.net/c/x.pdf?sv=2022-11-02&sp=r&" + "sig" + "=" + "AbC1".repeat(10) + "%3D";
  const entra = "abc" + "8Q" + "~" + "x".repeat(34);
  const teams = "https://org.webhook.office" + ".com/webhookb2/" + "0123abcd-".repeat(5) + "@x/IncomingWebhook/ab";
  const pat = "AZURE_DEVOPS_PAT" + "=" + "a1".repeat(26);
  const accountKey = "AccountName=x;Account" + "Key=" + "Ab+/".repeat(22);
  const privateKey = "-----BEGIN " + "OPENSSH PRIVATE KEY-----";
  const cases = [
    ["een SAS", sas, "SAS"],
    ["een Entra-secret", entra, "Entra"],
    ["een Teams-webhook", teams, "webhook"],
    ["een PAT", pat, "PAT"],
    ["een accountsleutel", accountKey, "accountsleutel"],
    ["een private key", privateKey, "private key"],
  ];

  for (const [kind, secret, expected] of cases) {
    it(`vindt ${kind}, met bestand en regel, zonder de waarde te noemen`, () => {
      const found = run(checkSecretPatterns, "scripts/debug.ts", `const a = 1;\nconst value = "${secret}";\n`);
      expect(found).toHaveLength(1);
      expect(found[0]).toContain("scripts/debug.ts:2");
      expect(found[0]).toContain(expected);
      expect(found[0]).not.toContain(secret.slice(-12));
    });
  }

  it("laat een document over de patronen, .env-bestanden, lockfiles en een gemarkeerde regel staan", () => {
    const doc = ["Een SAS draagt `sig=`, een opslagstring `AccountKey=`.", "AZURE_DEVOPS_PAT_EXPIRES=2026-12-31", 'const pat = process.env["AZURE_DEVOPS_PAT"] ?? "";'].join("\n");
    expect(run(checkSecretPatterns, "docs/x.md", doc)).toEqual([]);
    expect(run(checkSecretPatterns, ".env.local", pat)).toEqual([]);
    expect(run(checkSecretPatterns, "pnpm-lock.yaml", sas)).toEqual([]);
    expect(run(checkSecretPatterns, "scripts/x.ts", `// secretlint-disable-next-line\nconst value = "${sas}";\n`)).toEqual([]);
  });
});

describe("ai-output", () => {
  const view = (body) => `import { ProposalView } from "@/components/ai/proposal-view";\n${body}\n`;

  it("weigert ruwe HTML en een markdown-renderer in een bestand dat iets van de module ai toont", () => {
    const found = run(checkAiOutput, "components/requests/suggestion.tsx", view('import Markdown from "react-markdown";\nexport const X = () => <div dangerouslySetInnerHTML={{ __html: text }} />;'));
    expect(found).toHaveLength(2);
    expect(found[0]).toContain("components/requests/suggestion.tsx:3");
    expect(found[0]).toContain("dangerouslySetInnerHTML");
    expect(found[1]).toContain("react-markdown");
  });

  it("weigert ook de linkmaker van het template zelf", () => {
    const found = run(checkAiOutput, "app/(app)/requests/page.tsx", `import { runPrompt } from "@/lib/ai/run";\nimport { RichText } from "@/components/ui/rich-text";\n`);
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("@/components/ui/rich-text");
  });

  it("laat een bestand zonder de module ai met rust, en het woord in commentaar ook", () => {
    expect(run(checkAiOutput, "components/ui/doc-view.tsx", 'export const X = () => <div dangerouslySetInnerHTML={{ __html: "x" }} />;')).toEqual([]);
    expect(run(checkAiOutput, "components/ai/plain-text.tsx", "/** Nooit dangerouslySetInnerHTML. */\nexport const PlainText = () => null;")).toEqual([]);
    expect(run(checkAiOutput, "components/requests/suggestion.tsx", view("export const X = () => <ProposalView />;"))).toEqual([]);
  });
});

describe("ai-imports", () => {
  const rule = aiImportsRule(["app/(app)/requests", "lib/requests/"]);
  const text = 'import { runPrompt } from "@/lib/ai/run";\n';

  it("laat de mappen van de module zelf en de mappen van het project door", () => {
    for (const rel of ["lib/ai/run.ts", "components/ai/proposal-view.tsx", "app/(app)/admin/ai/page.tsx", "lib/project/registry.generated.ts", "scripts/check-ai.ts", "app/(app)/requests/actions.ts", "lib/requests/suggest.ts"]) {
      expect(run(rule, rel, text), rel).toEqual([]);
    }
  });

  it("weigert een map die het project niet noemt, en zegt waar hij bij moet", () => {
    const found = run(rule, "app/(app)/orders/actions.ts", text);
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("app/(app)/orders/actions.ts:1");
    expect(found[0]).toContain("PROJECT_AI_IMPORT_ROOTS");
  });

  it("weigert een map voor gasten of klanten altijd, ook als hij op de lijst staat", () => {
    const open = aiImportsRule(["app/(portal)/", "app/sign-in/"]);
    for (const rel of ["app/(portal)/tickets/actions.ts", "app/sign-in/help-actions.ts"]) {
      const found = run(open, rel, text);
      expect(found, rel).toHaveLength(1);
      expect(found[0]).toContain("gasten of klanten");
    }
  });

  it("ziet ook een relatief pad en een import type, en laat een andere import met rust", () => {
    expect(run(rule, "lib/orders/suggest.ts", 'import type { Proposal } from "../ai/structure";\n')).toHaveLength(1);
    expect(run(rule, "lib/orders/suggest.ts", 'import { labels } from "@/lib/i18n/labels";\nimport { aid } from "@/lib/aid";\n')).toEqual([]);
  });
});

describe("client-graph", () => {
  function repo(files) {
    const root = mkdtempSync(join(tmpdir(), "client-graph-"));
    for (const [rel, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), text);
    }
    return root;
  }

  async function graph(files) {
    const root = repo(files);
    try {
      const found = [];
      await checkClientGraph(root, (message) => found.push(message));
      return found;
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  it("volgt een omweg van twee imports tot de database en noemt de route", async () => {
    const found = await graph({
      "components/form.tsx": `"use client";\nimport { rule } from "@/lib/rules";\n`,
      "lib/rules.ts": `import { CONTAINER } from "./storage";\nexport const rule = 1;\n`,
      "lib/storage.ts": `import { getDb } from "@/lib/db/client";\nexport const CONTAINER = process.env.STORAGE_CONTAINER;\n`,
    });
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("components/form.tsx -> lib/rules.ts -> lib/storage.ts");
    expect(found[0]).toContain("@/lib/db/client");
    expect(found[0]).toContain("process.env.STORAGE_CONTAINER");
  });

  it("stopt bij een use server-grens en negeert import type en publieke variabelen", async () => {
    const found = await graph({
      "components/form.tsx": `"use client";\nimport { save } from "@/app/actions";\nimport type { Row } from "@/lib/db/rows";\nimport { name } from "@/lib/public";\n`,
      "app/actions.ts": `"use server";\nimport { getDb } from "@/lib/db/client";\nexport async function save() {}\n`,
      "lib/public.ts": `export const name = process.env.NEXT_PUBLIC_NAME ?? process.env.NODE_ENV;\n`,
    });
    expect(found).toEqual([]);
  });
});

describe("raw-html", () => {
  it("vindt ruwe HTML in elke vorm, met het regelnummer", () => {
    expect(run(checkRawHtml, "components/x.tsx", "const a = 1;\nexport const X = () => <div dangerouslySetInnerHTML={{ __html: a }} />;")).toHaveLength(1);
    expect(run(checkRawHtml, "components/x.tsx", "node.innerHTML = text;")[0]).toMatch(/^components\/x\.tsx:1 /);
    expect(run(checkRawHtml, "lib/x.ts", "node.outerHTML += text;\nnode.insertAdjacentHTML(\"beforeend\", text);\ndocument.write(text);")).toHaveLength(3);
  });

  it("laat uitlezen, een vergelijking, commentaar en tests met rust", () => {
    expect(run(checkRawHtml, "lib/x.ts", "const html = node.innerHTML;\nif (node.innerHTML === \"\") stop();\n/* geen dangerouslySetInnerHTML */\n// node.innerHTML = x")).toEqual([]);
    expect(run(checkRawHtml, "lib/x.test.ts", "node.innerHTML = text;")).toEqual([]);
    expect(run(checkRawHtml, "docs/x.md", "dangerouslySetInnerHTML")).toEqual([]);
  });
});

describe("csv-export", () => {
  const answer = 'return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8" } });';

  it("vindt een antwoord, een opslag en een Blob als text/csv zonder csvDocument, met het regelnummer", () => {
    expect(run(checkCsvExport, "app/api/export/route.ts", `const body = rows.map((row) => row.join(";")).join("\\n");\n${answer}`)[0]).toMatch(/^app\/api\/export\/route\.ts:2 een antwoord als text\/csv zonder csvDocument/);
    expect(run(checkCsvExport, "app/api/export/route.ts", 'headers.set("content-type", "text/csv");')).toHaveLength(1);
    expect(run(checkCsvExport, "lib/x.ts", 'await put(name, text, { contentType: "text/csv" });')).toHaveLength(1);
    expect(run(checkCsvExport, "components/x.tsx", 'const blob = new Blob(\n  [lines.join(";")],\n  { type: "text/csv;charset=utf-8" },\n);')[0]).toMatch(/^components\/x\.tsx:3 een Blob als text\/csv/);
  });

  it("laat een export via csv-safe, het type van een upload, commentaar en tests met rust", () => {
    expect(run(checkCsvExport, "app/api/export/route.ts", `import { csvDocument } from "@/lib/domain/csv-safe";\nconst body = csvDocument(rows);\n${answer}`)).toEqual([]);
    expect(run(checkCsvExport, "lib/files/blob.ts", 'if (contentType === "text/csv") return verify(bytes);\nconst types = new Map([["text/csv", "csv"]]);\n// "Content-Type": "text/csv"')).toEqual([]);
    expect(run(checkCsvExport, "lib/x.test.ts", 'headers.set("content-type", "text/csv");')).toEqual([]);
    expect(run(checkCsvExport, "e2e/10-export.spec.ts", 'expect(headers).toHaveProperty("content-type", "text/csv");')).toEqual([]);
    expect(run(checkCsvExport, "docs/x.md", '"Content-Type": "text/csv"')).toEqual([]);
  });

  it("laat een bewuste uitzondering alleen door met een reden, en alleen in commentaar", () => {
    expect(run(checkCsvExport, "app/api/files/route.ts", `/* csv: de bytes van een opgeslagen upload, ongewijzigd */\n${answer}`)).toEqual([]);
    expect(run(checkCsvExport, "app/api/files/route.ts", `// csv: de bytes van een opgeslagen upload\n${answer}`)).toEqual([]);
    expect(run(checkCsvExport, "app/api/files/route.ts", `/* csv: */\n${answer}`)).toHaveLength(1);
    expect(run(checkCsvExport, "app/api/files/route.ts", `const options = { csv: true };\n${answer}`)).toHaveLength(1);
  });
});

describe("raw-sql", () => {
  it("vindt sql.raw met een variabele, unsafe, en een query uit een sjabloon of uit geplakte tekst", () => {
    expect(run(checkRawSql, "lib/x.ts", "db.execute(sql.raw(order));")).toHaveLength(1);
    expect(run(checkRawSql, "lib/x.ts", "db.execute(sql.raw(`select * from ${table}`));")).toHaveLength(1);
    expect(run(checkRawSql, "lib/x.ts", "client.unsafe(text);")).toHaveLength(1);
    expect(run(checkRawSql, "scripts/x.ts", "await pool.query(`delete from ${table}`);")).toHaveLength(1);
    expect(run(checkRawSql, "scripts/x.ts", "await pool.query(\"select * from \" + table);")).toHaveLength(1);
  });

  it("laat een vaste tekst, parameters en de gelabelde vorm met rust", () => {
    expect(run(checkRawSql, "lib/x.ts", "db.execute(sql.raw(\"select 1\"));\ndb.execute(sql`select * from users where id = ${id}`);\nawait pool.query(\"select $1::int\", [n]);\nawait pool.query(text);")).toEqual([]);
    expect(run(checkRawSql, "lib/x.test.ts", "db.execute(sql.raw(order));")).toEqual([]);
  });

  it("laat een bewuste uitzondering door als de reden erboven staat, ook bij een opdracht over meer regels", () => {
    const statement = "await pool.query(`\n  do $$ begin\n    create role ${role} login;\n    grant ${group} to ${role};\n  end $$`);";
    expect(run(checkRawSql, "scripts/x.ts", statement)).toHaveLength(1);
    expect(run(checkRawSql, "scripts/x.ts", `/* sql: een rol aanmaken kent geen parameters, de naam is hierboven getoetst */\n${statement}`)).toEqual([]);
    /* Zonder reden telt het niet, en een reden die te ver erboven staat ook niet. */
    expect(run(checkRawSql, "scripts/x.ts", `/* sql: */\n${statement}`)).toHaveLength(1);
    expect(run(checkRawSql, "scripts/x.ts", `/* sql: een reden */\nconst a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;\n${statement}`)).toHaveLength(1);
  });
});

describe("public-routes", () => {
  const rule = publicRoutesRule(["/sign-in", "/api/auth", "/api/cron"]);

  it("leest het adres van een pagina of route, ook in een module en met een groep in het pad", () => {
    expect(routeOf("app/(app)/admin/ai/page.tsx")).toEqual({ kind: "page", behindSession: true, path: "/admin/ai" });
    expect(routeOf("app/sign-in/reset/[token]/page.tsx")).toEqual({ kind: "page", behindSession: false, path: "/sign-in/reset/[token]" });
    expect(routeOf("template/modules/files/files/app/api/files/[id]/route.ts")).toEqual({ kind: "route", behindSession: false, path: "/api/files/[id]" });
    expect(routeOf("app/page.tsx")).toEqual({ kind: "page", behindSession: false, path: "/" });
    expect(routeOf("app/layout.tsx")).toBeNull();
    expect(routeOf("e2e/app/page.tsx")).toBeNull();
  });

  it("leest de lijst uit de bron, en telt alleen op de grens van een padstuk", () => {
    expect(pathsIn("export const TEMPLATE_PUBLIC_PATHS: readonly string[] = [\"/sign-in\", \"/api/auth\"];", "TEMPLATE_PUBLIC_PATHS")).toEqual(["/sign-in", "/api/auth"]);
    expect(pathsIn("export const PROJECT_PUBLIC_PATHS: readonly string[] = [];", "PROJECT_PUBLIC_PATHS")).toEqual([]);
    expect(isListed("/sign-in/reset", ["/sign-in"])).toBe(true);
    expect(isListed("/sign-inner", ["/sign-in"])).toBe(false);
  });

  it("weigert een pagina buiten het afgeschermde deel die niet op de lijst staat", () => {
    const found = run(rule, "app/rapport/page.tsx", "export default function Page() { return <main>cijfers</main>; }");
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("/rapport");
  });

  it("laat een pagina door die afgeschermd is, op de lijst staat, of zelf met de sessie begint", () => {
    expect(run(rule, "app/(app)/rapport/page.tsx", "export default function Page() { return <main />; }")).toEqual([]);
    expect(run(rule, "app/sign-in/reset/page.tsx", "export default function Page() { return <main />; }")).toEqual([]);
    expect(run(rule, "app/(portal)/overzicht/page.tsx", "export default async function Page() { const actor = await requireSession(); return <main>{actor.name}</main>; }")).toEqual([]);
  });

  it("laat de startpagina door die alleen doorstuurt, maar niet een die iets toont", () => {
    expect(run(rule, "app/page.tsx", "export default function Page(): never { redirect(\"/home\"); }")).toEqual([]);
    expect(run(rule, "app/page.tsx", "export default function Page() { return <main>welkom</main>; }")).toHaveLength(1);
  });

  it("weigert een route zonder poort, en ziet een poort in commentaar niet aan voor een poort", () => {
    expect(run(rule, "app/api/export/route.ts", "export async function GET() { return Response.json(await rows()); }")).toHaveLength(1);
    expect(run(rule, "app/api/export/route.ts", "// requireSession() komt later\nexport async function GET() { return Response.json([]); }")).toHaveLength(1);
    expect(run(rule, "app/api/export/route.ts", "export async function GET() { const actor = await requireActor(); return Response.json(await rows(actor)); }")).toEqual([]);
    expect(run(rule, "app/api/cron/nacht/route.ts", "export async function GET(request) { return run(request); }")).toEqual([]);
  });
});

describe("organisation-scope", () => {
  const schema = "export const users = pgTable(\n  \"users\",\n  { id: uuid(\"id\"), organisationId: uuid(\"organisation_id\") },\n);\n\nexport const organisations = pgTable(\n  \"organisations\",\n  { id: uuid(\"id\") },\n);\n";
  const rule = organisationScopeRule(organisationTables(schema));

  it("kent alleen de tabellen met een kolom voor de organisatie", () => {
    expect(organisationTables(schema)).toEqual(["users"]);
  });

  it("vindt lezen, wijzigen en verwijderen zonder het filter", () => {
    expect(run(rule, "lib/x.ts", "const rows = await db.select().from(users).where(eq(users.id, id));")).toHaveLength(1);
    expect(run(rule, "lib/x.ts", "await db.update(users).set({ isActive: false }).where(eq(users.id, id));")).toHaveLength(1);
    expect(run(rule, "lib/x.ts", "await db.delete(users).where(eq(users.id, id));")).toHaveLength(1);
  });

  it("laat een query met het filter door, ook als het filter in een variabele staat", () => {
    expect(run(rule, "lib/x.ts", "const rows = await db.select().from(users).where(and(eq(users.id, id), eq(users.organisationId, actor.organisationId)));")).toEqual([]);
    expect(run(rule, "lib/x.ts", "const scope = and(eq(users.organisationId, organisationId), isNull(users.deletedAt));\nconst rows = await db.select().from(users).where(scope);")).toEqual([]);
  });

  it("laat een bewuste uitzondering door als de reden erbij staat, en anders niet", () => {
    expect(run(rule, "lib/x.ts", "/* organisatie: bij het inloggen is er nog geen sessie */\nconst rows = await db.select().from(users).where(eq(users.externalId, id));")).toEqual([]);
    expect(run(rule, "lib/x.ts", "/* organisatie: */\nconst rows = await db.select().from(users).where(eq(users.externalId, id));")).toHaveLength(1);
  });

  it("laat een tabel zonder die kolom, een insert, tests en scripts met rust", () => {
    expect(run(rule, "lib/x.ts", "await db.select().from(organisations).limit(1);\nawait db.insert(users).values(row);")).toEqual([]);
    expect(run(rule, "lib/x.test.ts", "await db.select().from(users);")).toEqual([]);
    expect(run(rule, "scripts/check-x.ts", "await db.select().from(users);")).toEqual([]);
  });
});

describe("claude-settings", () => {
  const settings = (value) => settingsProblems(JSON.stringify(value));

  it("laat de instellingen van het template door", () => {
    expect(
      settings({
        enabledPlugins: { "security-guidance@claude-plugins-official": true, "claude-security@claude-plugins-official": true },
        permissions: { deny: ["Bash(claude plugin *)", "Bash(claude mcp add*)"] },
      }),
    ).toEqual([]);
  });

  it("weigert een hook en elke instelling die niet op de lijst staat", () => {
    const found = settings({ hooks: { Stop: [] }, env: { NODE_OPTIONS: "--require ./x.js" }, apiKeyHelper: "./key.sh" });
    expect(found).toHaveLength(3);
    expect(found[0]).toContain('"hooks"');
    expect(found[0]).toContain("Een hook draait een opdracht");
  });

  it("weigert een plugin of marketplace buiten de officiële, en laat uitzetten toe", () => {
    expect(settings({ enabledPlugins: { "handig@iemand-anders": true } })[0]).toContain('"handig@iemand-anders"');
    expect(settings({ enabledPlugins: { "handig@iemand-anders": false } })).toEqual([]);
    expect(settings({ extraKnownMarketplaces: { "iemand-anders": { source: { source: "github", repo: "iemand/plugins" } } } })).toHaveLength(1);
    expect(settings({ extraKnownMarketplaces: { "claude-plugins-official": { source: { source: "github", repo: "iemand/plugins" } } } })).toHaveLength(1);
    expect(settings({ extraKnownMarketplaces: { "claude-plugins-official": { source: { source: "github", repo: "anthropics/claude-plugins-official" } } } })).toEqual([]);
  });

  it("weigert MCP-servers zonder vraag, het overslaan van elke vraag en een extra map", () => {
    expect(settings({ enableAllProjectMcpServers: true })).toHaveLength(1);
    expect(settings({ enableAllProjectMcpServers: false })).toEqual([]);
    expect(settings({ permissions: { defaultMode: "bypassPermissions" } })).toHaveLength(1);
    expect(settings({ permissions: { additionalDirectories: ["../"] } })).toHaveLength(1);
  });

  it("meldt kapotte JSON en een .mcp.json in de repo", () => {
    expect(settingsProblems("{ kapot")).toEqual([".claude/settings.json is geen geldige JSON"]);
    const root = mkdtempSync(join(tmpdir(), "claude-settings-"));
    try {
      writeFileSync(join(root, ".mcp.json"), JSON.stringify({ mcpServers: { x: { command: "npx", args: ["iets"] } } }));
      const found = [];
      checkClaudeSettings(root, (message) => found.push(message));
      expect(found).toHaveLength(1);
      expect(found[0]).toContain(".mcp.json");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("de instellingen in deze repo zijn schoon", () => {
    const found = [];
    checkClaudeSettings(process.cwd(), (message) => found.push(message));
    expect(found).toEqual([]);
  });
});
