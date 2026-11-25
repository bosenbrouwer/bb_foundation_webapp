/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Wat zonder sessie bereikbaar is: één korte, vaste lijst. Alles wat er niet op staat, hoort te
 * weigeren. Met een lijst is "is dit expres openbaar" een vraag met een antwoord.
 *
 * Drie plekken lezen hem:
 *
 * - **De proxy** (`proxy.ts`) stuurt een verzoek naar een pagina buiten de lijst zonder sessiecookie
 *   meteen naar de inlog, en geeft op een route onder `/api` buiten de lijst een 401. Dat is een
 *   buitenste ring en geen grens: de proxy kijkt alleen of er een cookie is, niet of hij klopt, een
 *   pad dat op de extensie van een bestand eindigt komt er niet langs, en middleware is in dit
 *   framework drie keer te omzeilen gebleken (les L-NEXT-19). Elke pagina, server action en route
 *   handler controleert daarom zelf opnieuw.
 * - **De huisregel `public-routes`** weigert bij de build een pagina buiten `app/(app)/` die niet op
 *   de lijst staat en niet zelf met de sessie begint, en een route handler zonder poort.
 * - **`pnpm check:public`** gaat elke route zonder sessie langs, met de proxy aan en met de proxy uit,
 *   en eist de inlog, een 401 of een 404. Zo is bewezen dat de binnenkant houdt als de proxy wegvalt.
 *
 * Een item is een pad. Wat er precies op staat of eronder hangt, is openbaar. `/api/cron` staat erop
 * omdat de host die routes zonder sessie aanroept; zonder het geheim doen ze niets (lib/cron/guard.ts).
 * Eigen openbare adressen van het project staan in `public-paths.project.ts`.
 */
import { deployEnvironment } from "@/lib/domain/deploy-environment";
import { PROJECT_PUBLIC_PATHS } from "./public-paths.project";

/* Vaste teksten en geen constante: de huisregel `public-routes` leest deze regel zonder de code te draaien. De test bewaakt dat het eerste item het inlogscherm is. */
export const TEMPLATE_PUBLIC_PATHS: readonly string[] = ["/sign-in", "/api/auth", "/api/cron"];

export const PUBLIC_PATHS: readonly string[] = [...TEMPLATE_PUBLIC_PATHS, ...PROJECT_PUBLIC_PATHS];

/** Staat dit pad op de lijst, of hangt het eronder? Een item telt alleen op een grens van een padstuk. */
export function isPublicPath(pathname: string, list: readonly string[] = PUBLIC_PATHS): boolean {
  return list.some((entry) => pathname === entry || pathname.startsWith(`${entry}/`));
}

/** De sessiecookie van Auth.js, ook als hij in stukken is geknipt (`.0`, `.1`). */
const SESSION_COOKIE = /^(?:__Secure-|__Host-)?authjs\.session-token(?:\.\d+)?$/;

export function hasSessionCookie(cookieNames: readonly string[]): boolean {
  return cookieNames.some((name) => SESSION_COOKIE.test(name));
}

/** Een route handler: daar hoort een statuscode als antwoord, geen doorverwijzing naar een scherm. */
export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/**
 * Wat het framework zelf uitdeelt (de bundels, en in ontwikkeling de verbinding die de pagina
 * ververst): geen inhoud van de tool, en het inlogscherm heeft het nodig voordat er een sessie is.
 */
function isFrameworkPath(pathname: string): boolean {
  return pathname.startsWith("/_next/") || pathname.startsWith("/__nextjs");
}

export type GateVerdict = "pass" | "sign-in" | "unauthorized";

/**
 * Puur: laat de proxy dit verzoek door? Zonder sessiecookie alleen wat op de lijst staat. Een pad
 * dat niet bestaat krijgt zonder cookie hetzelfde antwoord als een pad dat wel bestaat: de inlog
 * voor een pagina, een 401 voor een route onder `/api`. Van buiten is dus niet te zien welke
 * pagina's en routes er zijn.
 */
export function gateVerdict(pathname: string, cookieNames: readonly string[], list: readonly string[] = PUBLIC_PATHS): GateVerdict {
  if (isFrameworkPath(pathname) || isPublicPath(pathname, list) || hasSessionCookie(cookieNames)) return "pass";
  return isApiPath(pathname) ? "unauthorized" : "sign-in";
}

export const PROXY_GATE_ENV = "PROXY_GATE";

/**
 * De poort staat altijd aan, behalve als `PROXY_GATE=off` staat in een uitdrukkelijk lokale omgeving.
 * Die schakelaar is er voor één doel: `pnpm check:public` bewijst ermee dat elke pagina en route ook
 * zonder de proxy dicht is. Buiten lokaal doet de variabele niets: bij twijfel dicht.
 */
export function proxyGateOff(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env[PROXY_GATE_ENV] === "off" && deployEnvironment(env) === "local";
}
