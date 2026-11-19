/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Migraties uitvoeren tijdens een deploy. Het build-commando op Vercel is `pnpm db:deploy && pnpm build`.
 *
 * Gebruik: pnpm db:deploy
 *
 * Past dezelfde migraties toe als `pnpm db:migrate`, met hetzelfde codepad (scripts/lib/migrate.ts),
 * en verschilt op drie punten:
 *
 * 1. **Een guard op de productiebranch.** Een deploy buiten productie (een preview, of een host waar
 *    de omgeving onbekend is) hoort nooit de productiedatabase te migreren; zie
 *    `lib/domain/deploy-environment.ts`, want een guard op `VERCEL_ENV` alleen faalde buiten Vercel
 *    open. Welke branch aan welke Vercel-omgeving hangt is een instelling in een console, en
 *    instellingen in consoles gaan een keer mis. Deze guard maakt van die vergissing een gefaalde
 *    preview-build in plaats van een stilletjes gemigreerde productiedatabase.
 * 2. **Een advisory lock.** Twee deploys tegelijk, bijvoorbeeld twee merges vlak na elkaar, zouden
 *    anders allebei dezelfde migratie draaien. De tweede wacht nu tot de eerste klaar is en
 *    constateert dan dat er niets te doen is.
 * 3. **Leesbare uitvoer in het buildlog**, met het endpoint erbij, zodat je achteraf kunt zien wat er
 *    waar gebeurd is.
 *
 * **Na de migraties zet hij de basisgegevens neer** (`ensureBaseData`, hetzelfde als
 * `pnpm db:bootstrap`): de organisatie uit de configuratie en de referentiegegevens van het project.
 * Die horen op elke omgeving te staan, ook op productie, en zonder de organisatierij faalt de eerste
 * inlog en de eerste uitnodiging. Vóór besluit D21 deed niets dat op productie: geen migratie maakt
 * die rij, en geen handleiding liet het script daar draaien. Idempotent: alleen upserts, dus elke
 * deploy opnieuw is veilig.
 */

import { Pool } from "@neondatabase/serverless";
import { deployEnvironment } from "../lib/domain/deploy-environment";
import { ensureBaseData } from "./lib/bootstrap";
import { assertProductionTarget, describeTarget, directUrl, scriptDb } from "./lib/connection";
import { applyMigrations } from "./lib/migrate";
import { runScript } from "./lib/run";

/** Een willekeurig maar vast getal. Advisory locks delen één naamruimte per database, dus dit nummer hoort alleen bij het migreren. */
const LOCK_KEY = 4711_2026;

/** Zo lang wachten we op een andere deploy voordat we opgeven. */
const LOCK_TIMEOUT_MS = 120_000;
const LOCK_RETRY_MS = 2_000;

/**
 * Weigert te migreren als een deploy buiten productie op de productiebranch uitkomt, en als een
 * productiedeploy er juist niet op uitkomt. Dat laatste bestaat sinds de eigenaar een eigen variabele
 * kan hebben (`DATABASE_URL_OWNER`, zie lib/db/owner-url.ts): een met de hand geplakte waarde die naar
 * een andere branch wijst, zou anders stil die branch migreren.
 *
 * Fail closed: staat `PRODUCTION_DB_ENDPOINT` niet ingesteld, dan kunnen we het buiten productie
 * niet controleren en gaan we er niet vanuit dat het wel goed zit.
 */
function assertSafeTarget(url: string, endpoint: string): void {
  if (deployEnvironment() === "production") {
    assertProductionTarget(url);
    return;
  }

  const production = process.env.PRODUCTION_DB_ENDPOINT;
  if (production === undefined || production === "") {
    throw new Error(
      [
        `PRODUCTION_DB_ENDPOINT ontbreekt, dus er is niet te controleren of deze deploy (omgeving ${deployEnvironment()}) op de`,
        "productiedatabase uitkomt.",
        "",
        "Zet in Vercel, scope Production en Preview (op een andere host: zet daar ook APP_ENV op production of preview):",
        "  PRODUCTION_DB_ENDPOINT = het endpoint-id van de productiebranch (alleen het id, geen wachtwoord)",
        "Zie docs/handleiding/04-neon.md.",
      ].join("\n"),
    );
  }

  if (endpoint === production) {
    const branch = process.env.VERCEL_GIT_COMMIT_REF;
    throw new Error(
      [
        `Deze deploy (omgeving ${deployEnvironment()}) wijst naar ${endpoint}, en dat is de productiebranch. Er is niets gemigreerd.`,
        "",
        `Deze deploy komt van branch ${branch ?? "onbekend"}.`,
        "",
        "Meestal is dit een preview-deploy zonder pull request. De Neon-integratie maakt alleen een",
        "wegwerpbranch aan bij een PR, en zonder PR valt Vercel terug op de basiswaarde van DATABASE_URL",
        "in de Preview-omgeving. Open een pull request, of deploy naar productie. Zie docs/handleiding/03-vercel.md.",
      ].join("\n"),
    );
  }
}

/**
 * Pakt de lock, of wacht tot een andere deploy hem loslaat.
 *
 * `pg_try_advisory_lock` in plaats van `pg_advisory_lock`, want die laatste wacht oneindig en dan
 * hangt een build tot Vercel hem afkapt zonder te zeggen waarom.
 */
async function acquireLock(pool: Pool): Promise<() => Promise<void>> {
  const client = await pool.connect();
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  let announced = false;

  for (;;) {
    const result = await client.query<{ locked: boolean }>("select pg_try_advisory_lock($1) as locked", [LOCK_KEY]);

    if (result.rows[0]?.locked === true) {
      return async () => {
        await client.query("select pg_advisory_unlock($1)", [LOCK_KEY]);
        client.release();
      };
    }

    if (Date.now() > deadline) {
      client.release();
      throw new Error("Er draait al twee minuten een andere migratie op deze database. Afgebroken zonder iets te doen.");
    }

    if (!announced) {
      console.log("Een andere deploy migreert nog. Wachten tot die klaar is.");
      announced = true;
    }

    await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
  }
}

runScript(async () => {
  const url = directUrl();
  const endpoint = describeTarget(url);
  const where = deployEnvironment();

  console.log(`Migreren vanuit omgeving ${where} naar endpoint ${endpoint}`);
  assertSafeTarget(url, endpoint);

  const pool = new Pool({ connectionString: url });
  try {
    const release = await acquireLock(pool);
    try {
      const applied = await applyMigrations(pool);
      console.log(applied.length === 0 ? "Niets te migreren." : `Migraties bijgewerkt: ${applied.length}.`);
      /* Binnen hetzelfde slot: twee deploys tegelijk maken zo nooit allebei de organisatie aan. */
      console.log("Basisgegevens (de organisatie en wat het project op elke omgeving nodig heeft):");
      await ensureBaseData(scriptDb(pool));
      if (process.env.VERCEL_ENV === "production" && (process.env.DATABASE_URL_APP ?? "").trim() === "") {
        console.warn(
          "\nLET OP: DATABASE_URL_APP ontbreekt. De app verbindt op productie als eigenaar van de database, langs het slot op elke tabel. Maak de inlogrol en zet de variabele: docs/handleiding/04-neon.md, \"De rol van de app op productie\".\n",
        );
      }
    } finally {
      await release();
    }
  } finally {
    await pool.end();
  }
});
