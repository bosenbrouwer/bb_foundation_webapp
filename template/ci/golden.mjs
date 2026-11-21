/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De gouden test van het template: maak een vers project uit deze werkkopie, pas een
 * voorbeeldconfiguratie toe en bewijs dat alles bouwt en dat apply idempotent is.
 *
 *   node template/ci/golden.mjs voorbeeld        één configuratie uit examples/
 *   node template/ci/golden.mjs --keep minimaal  laat de map staan om erin te kijken
 *
 * Het pad van de tijdelijke map bevat met opzet een spatie en een &: dat is de vorm die op Windows
 * geneste pnpm-scripts brak, en de tooling hoort er niets van te merken.
 *
 * Stappen: kopie van de werkkopie (zonder node_modules en .next), de voorbeeldconfig over
 * project.config.json, git init en commit, pnpm install, template:apply --strict, de batterij
 * zonder database (typecheck, lint, test, check:migrations, check:drift, check:contrast,
 * template:verify, build, en check:public tegen die build), een tweede apply en template:generate die
 * niets mogen veranderen, en template:report-back (besluit D31) tot vlak voor het versturen.
 */

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, relative, sep } from "node:path";

/** Wat niet mee kopieert: afhankelijkheden, bouwuitvoer, git, en elk .env-bestand behalve het sjabloon, zodat de run gegarandeerd zonder database en zonder geheimen is. */
const SKIPPED = new Set(["node_modules", ".next", ".git", ".vercel", ".template-backup", "coverage", "playwright-report", "test-results"]);
function excluded(source, path) {
  const rel = relative(source, path).split(sep).join("/");
  if (rel === "") return false;
  const parts = rel.split("/");
  if (parts.some((part) => SKIPPED.has(part))) return true;
  const name = parts[parts.length - 1] ?? "";
  return name.startsWith(".env") && name !== ".env.example";
}

const args = process.argv.slice(2);
const keep = args.includes("--keep");
const example = args.find((arg) => !arg.startsWith("--")) ?? "default";
const source = process.cwd();

const base = mkdtempSync(join(tmpdir(), "bb foundation & golden-"));
const root = join(base, "project");

/**
 * pnpm zonder shell. Op Windows is `pnpm` een .cmd-shim die cmd.exe nodig heeft, en de shim van
 * een globale npm-installatie breekt op een & in het gebruikerspad (precies de les die dit script
 * bewaakt). Daarom zoeken we het JavaScript-startpunt van pnpm en draaien dat met deze node:
 * onder pnpm zelf staat het in npm_execpath, anders staat het naast de shim op het PATH.
 */
function pnpmLauncher() {
  const exec = process.env.npm_execpath;
  if (exec !== undefined && exec !== "") return /\.[cm]?js$/.test(exec) ? [process.execPath, exec] : [exec];
  for (const dir of (process.env.PATH ?? "").split(delimiter).filter((entry) => entry !== "")) {
    for (const candidate of [
      join(dir, "node_modules", "pnpm", "bin", "pnpm.cjs"), // npm global prefix op Windows
      join(dir, "..", "pnpm", "bin", "pnpm.cjs"), // een node_modules/.bin, zoals pnpm/action-setup
      join(dir, "..", "lib", "node_modules", "pnpm", "bin", "pnpm.cjs"), // npm global prefix op Linux en macOS
    ]) {
      if (existsSync(candidate)) return [process.execPath, candidate];
    }
  }
  return ["pnpm"];
}
const PNPM = pnpmLauncher();

function run(command, commandArgs) {
  const started = Date.now();
  const [executable, ...prefix] = command === "pnpm" ? PNPM : [command];
  const result = spawnSync(executable, [...prefix, ...commandArgs], { cwd: root, stdio: "inherit", shell: false });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (result.error !== undefined || result.status !== 0) {
    console.error(`\nGouden test gestopt bij: ${command} ${commandArgs.join(" ")} (${seconds} s)${result.error === undefined ? "" : `: ${result.error.message}`}`);
    console.error(`De map staat nog: ${root}`);
    process.exit(result.status ?? 1);
  }
  console.log(`  klaar in ${seconds} s: ${command} ${commandArgs.join(" ")}`);
}

/** pnpm met de uitvoer als tekst, voor een stap die moet weigeren of een vaste zin moet zeggen. */
function capture(commandArgs) {
  const [executable, ...prefix] = PNPM;
  const result = spawnSync(executable, [...prefix, ...commandArgs], { cwd: root, encoding: "utf8", shell: false });
  return { status: result.status ?? 1, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

function expectThat(condition, message, output) {
  if (condition) return;
  console.error(`\nGouden test gestopt: ${message}\n${output}`);
  console.error(`De map staat nog: ${root}`);
  process.exit(1);
}

/**
 * De opdracht van besluit D31 in een echt project, met de echte geheimenscans. Er gaat niets naar
 * buiten: elke stap hier weigert vóór de eerste aanroep van gh (zonder akkoord, met een naam erin,
 * met een geheim erin), en de laatste stap legt een melding met de hand vast.
 */
function reportBack() {
  if (example === "default") {
    /* De standaardconfig is die van de templaterepo zelf: daar is niets terug te melden. */
    const refused = capture(["template:report-back"]);
    expectThat(refused.status === 1 && refused.output.includes("repo van het template zelf"), "op de standaardconfig had de opdracht moeten weigeren", refused.output);
    console.log("  op de standaardconfig weigert de opdracht, zoals in de templaterepo");
    return;
  }
  const fresh = capture(["template:report-back"]);
  expectThat(fresh.status === 0 && fresh.output.includes("Niets nieuws"), "een vers project had niets terug te melden", fresh.output);

  const lessons = join(root, "docs", "lessen-project.md");
  writeFileSync(lessons, `${readFileSync(lessons, "utf8")}\n## P-01 Een export brak op een puntkomma\n\n**Regel.** Altijd een BOM.\n`);
  const collected = capture(["template:report-back"]);
  const draftPath = join(root, ".terugmelding.md");
  expectThat(collected.status === 0 && existsSync(draftPath) && readFileSync(draftPath, "utf8").includes("## Les P-01:"), "de les staat niet in de melding", collected.output);
  expectThat(collected.output.includes("Neutraal"), "een neutrale melding werd niet neutraal genoemd", collected.output);

  const noConsent = capture(["template:report-back", "--send"]);
  expectThat(noConsent.status === 1 && noConsent.output.includes("akkoord"), "versturen zonder akkoord had moeten weigeren", noConsent.output);

  const name = JSON.parse(readFileSync(join(root, "project.config.json"), "utf8")).project.name;
  const draft = readFileSync(draftPath, "utf8").replace("- [ ] Akkoord:", "- [x] Akkoord:");
  writeFileSync(draftPath, `${draft}\nBij ${name} ging het zo.\n`);
  const withName = capture(["template:report-back", "--send"]);
  expectThat(withName.status === 1 && withName.output.includes(`"${name}"`), "een melding met de naam van het project had moeten weigeren", withName.output);

  /* In stukken, zodat de scans van deze repo het script zelf niet aanwijzen. */
  writeFileSync(draftPath, `${draft}\n${["-----BEGIN", "RSA", "PRIVATE", "KEY-----"].join(" ")}\n`);
  const withSecret = capture(["template:report-back", "--send"]);
  expectThat(withSecret.status === 1 && /geheim|private key/i.test(withSecret.output), "een melding met een geheim had moeten weigeren", withSecret.output);

  writeFileSync(draftPath, draft);
  const manual = capture(["template:report-back", "--sent", "1"]);
  expectThat(manual.status === 0 && !existsSync(draftPath), "een melding met de hand vastleggen lukte niet", manual.output);
  const after = capture(["template:report-back"]);
  expectThat(after.status === 0 && after.output.includes("Niets nieuws"), "na het vastleggen kwam de les terug", after.output);
  console.log("  niets nieuws, de les verzameld, geweigerd zonder akkoord, met een naam en met een geheim, met de hand vastgelegd");
}

console.log(`Gouden test met examples/${example}.project.config.json in ${root}\n`);

console.log("1. Een vers project uit de werkkopie");
cpSync(source, root, { recursive: true, filter: (path) => !excluded(source, path) });
/*
 * Precies wat "Use this template" op GitHub oplevert: de hele wortel, inclusief template.lock.json,
 * waarin staat wat het template als neutrale standaard meeleverde. Daarna zet het project zijn eigen
 * configuratie over de standaard, zoals de handleiding zegt.
 */
if (!existsSync(join(root, "template.lock.json"))) {
  console.error("De werkkopie heeft geen template.lock.json; draai eerst pnpm template:apply in de templaterepo.");
  process.exit(1);
}
const config = readFileSync(join(source, "examples", `${example}.project.config.json`), "utf8").replace('"../template/schema/', '"./template/schema/');
writeFileSync(join(root, "project.config.json"), config);
run("git", ["init", "--quiet", "--initial-branch=main"]);
run("git", ["add", "-A"]);
run("git", ["-c", "user.name=golden", "-c", "user.email=golden@voorbeeld.invalid", "commit", "--quiet", "-m", "Vers project uit het template"]);

console.log("\n2. Afhankelijkheden");
run("pnpm", ["install", "--frozen-lockfile", "--prefer-offline"]);

console.log("\n3. Het template toepassen");
run("pnpm", ["template:apply", "--strict", "--allow-dirty"]);

console.log("\n4. De batterij zonder database");
for (const script of ["typecheck", "lint", "test", "check:migrations", "check:drift", "check:contrast", "template:verify", "build", "check:public"]) {
  run("pnpm", [script]);
}

console.log("\n5. Idempotentie: een tweede apply en generate veranderen niets");
run("git", ["add", "-A"]);
/* --allow-empty: op de standaardconfig verandert apply niets, en dat is geen fout. */
run("git", ["-c", "user.name=golden", "-c", "user.email=golden@voorbeeld.invalid", "commit", "--quiet", "--allow-empty", "-m", "Na apply"]);
run("pnpm", ["template:apply", "--strict"]);
run("pnpm", ["template:generate"]);
const status = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).stdout.trim();
if (status !== "") {
  console.error("\nDe tweede apply of generate heeft iets veranderd:\n" + status);
  console.error(`De map staat nog: ${root}`);
  process.exit(1);
}

console.log("\n6. Terugmelden: niets nieuws in een vers project, en de sloten houden een melding tegen");
reportBack();

console.log(`\nGouden test geslaagd voor examples/${example}.project.config.json.`);
if (keep) console.log(`De map staat nog: ${root}`);
else rmSync(base, { recursive: true, force: true });
