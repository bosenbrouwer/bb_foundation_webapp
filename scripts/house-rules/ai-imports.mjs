/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: de module ai wordt alleen geïmporteerd vanuit mappen die het project noemt, en nooit vanuit
 * een map voor gasten of klanten.
 *
 * **Waarom.** Wat naar het model gaat, is een besluit per plek: welke gegevens, van wie, en of het
 * modelbedrijf daarvoor in de afspraken staat. Tekst van klanten gaat nooit naar het model: voor wat
 * een klant aanlevert, is de organisatie verwerker, en het modelbedrijf staat niet in de
 * verwerkersvoorwaarden. In een eerder project stond die grens alleen in commentaar en in een poort
 * per functie, niet in de lint. Deze regel maakt van een nieuwe plek een bewuste regel in
 * `scripts/house-rules/project-rules.mjs`. Zie docs/modules/ai.md en handleiding 24.
 *
 * **Wat mag.** De mappen van de module zelf, de scripts, de e2e en het gegenereerde register, plus
 * elke map uit `PROJECT_AI_IMPORT_ROOTS`. Een map voor gasten of klanten mag nooit, ook niet als hij
 * op die lijst staat. Zonder de module ai raakt de regel niets.
 */
import { posix } from "node:path";
import { lineAt } from "./files.mjs";
import * as projectRules from "./project-rules.mjs";

/** Waar de module zelf woont, en wat er altijd bij mag. */
const OWN_ROOTS = ["lib/ai/", "components/ai/", "app/(app)/admin/ai/", "lib/project/", "scripts/", "e2e/", "template/"];

/** Mapnamen voor wie niet bij de organisatie hoort of nog niet is ingelogd. */
const GUEST_SEGMENTS = new Set(["(portal)", "(guest)", "(public)", "(client)", "portal", "sign-in"]);

const IMPORT = /(?:import|export)\s+(?:type\s+)?(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/g;

/** Wijst de import naar de module ai: `@/lib/ai`, of een relatief pad dat daar uitkomt. */
function pointsAtAi(rel, specifier) {
  if (specifier === "@/lib/ai" || specifier.startsWith("@/lib/ai/")) return true;
  if (!specifier.startsWith(".")) return false;
  const resolved = posix.normalize(posix.join(posix.dirname(rel), specifier));
  return resolved === "lib/ai" || resolved.startsWith("lib/ai/");
}

export function aiImportsRule(projectRoots) {
  const roots = [...OWN_ROOTS, ...projectRoots.map((root) => (root.endsWith("/") ? root : `${root}/`))];

  return function checkAiImports(rel, text, report) {
    if (!/\.(ts|tsx|mts|mjs|js|jsx)$/.test(rel)) return;
    const guest = rel.split("/").some((segment) => GUEST_SEGMENTS.has(segment));
    const listed = roots.some((root) => rel.startsWith(root));
    if (listed && !guest) return;

    for (const match of text.matchAll(IMPORT)) {
      const specifier = match[1] ?? "";
      if (!pointsAtAi(rel, specifier)) continue;
      const where = `${rel}:${lineAt(text, match.index ?? 0)}`;
      if (guest) {
        report(`${where} importeert ${specifier} vanuit een map voor gasten of klanten. Tekst van klanten gaat nooit naar het model (docs/modules/ai.md); dit mag ook niet via PROJECT_AI_IMPORT_ROOTS.`);
      } else {
        report(`${where} importeert ${specifier}, maar deze map staat niet in PROJECT_AI_IMPORT_ROOTS (scripts/house-rules/project-rules.mjs). Noem de map daar als hier bewust AI wordt gebruikt, en werk het projectplan en de privacytekst bij.`);
      }
    }
  };
}

/** De regel met de mappen van dit project. Een project van vóór deze regel heeft de lijst nog niet. */
export const checkAiImports = aiImportsRule(Array.isArray(projectRules.PROJECT_AI_IMPORT_ROOTS) ? projectRules.PROJECT_AI_IMPORT_ROOTS : []);
