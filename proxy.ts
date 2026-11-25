/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { NextResponse, type NextRequest } from "next/server";
import { SIGN_IN_PATH } from "@/lib/auth/paths";
import { gateVerdict, proxyGateOff } from "@/lib/auth/public-paths";
import { contentSecurityPolicy, isPrefetch, newNonce, wantsNonce } from "@/lib/security/csp";

/**
 * Twee dingen per verzoek: de buitenste ring van de inlog, en een nonce met de CSP die hem noemt.
 * In Next 16 heet middleware `proxy.ts`.
 *
 * **De buitenste ring.** Een verzoek buiten de lijst van openbare adressen
 * (`lib/auth/public-paths.ts`) gaat zonder sessiecookie niet verder: een pagina wordt de inlog, een
 * route onder `/api` een 401, voordat er iets van de tool draait. Een pad dat niet bestaat krijgt zo
 * hetzelfde antwoord als een pad dat wel bestaat. Dit is een extra ring en geen grens (besluit D24):
 * de proxy kijkt of er een cookie is, niet of hij klopt, en middleware was in dit framework drie
 * keer te omzeilen (les L-NEXT-19). Elke pagina, server action en route handler controleert daarom
 * zelf opnieuw, en `pnpm check:public` bewijst dat de binnenkant ook houdt met deze poort uit.
 *
 * **De CSP.** Zie `lib/security/csp.ts` en de besluiten D14 en D17.
 *
 * ---
 *
 * **De CSP staat op het verzoek én op het antwoord.** Next leest de nonce uit de CSP-header van het
 * verzoek en zet hem op zijn eigen scripts; de browser leest de header van het antwoord. Zonder de
 * eerste krijgt geen enkel script de nonce en blijft de pagina dood, zonder de tweede is er geen
 * policy. De andere security headers blijven in `lib/config/next-base.ts`: die zijn vast en gelden
 * ook voor `/api` en de statische bestanden. Een tweede CSP daar zou de browser allebei afdwingen.
 *
 * **Wat hier langskomt, en wat een nonce krijgt.** De matcher slaat alleen over wat geen pagina en
 * geen route kan zijn: de bestanden van Next, en een pad dat op de extensie van een bestand eindigt
 * (de lijst hieronder, gelijk aan `STATIC_FILE_EXTENSIONS`). Al het andere komt langs de poort, ook
 * `/api` en een prefetch van `next/link`: stond die uitzondering in de matcher, dan sloeg een verzoek
 * dat de kop van een prefetch zelf meestuurt de poort over. De nonce is alleen voor een pagina
 * (`wantsNonce`). Een route onder `/api` houdt de vaste headers; de HTML-pagina's van Auth.js onder
 * `/api/auth` krijgen de vaste CSP zonder scripts uit `lib/config/next-base.ts`. Een prefetch krijgt
 * geen nonce, zoals de documentatie van Next aanraadt; de scripts die de router daarna invoegt,
 * erven het vertrouwen via `'strict-dynamic'`.
 *
 * **Geen autorisatie hier.** De poort kijkt of er een cookie is, niet van wie hij is en niet wat
 * diegene mag. Dat blijft in `requireSession()` en `can()`, op de plek waar het hoort (CLAUDE.md
 * regel 11).
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (!proxyGateOff()) {
    const verdict = gateVerdict(
      pathname,
      request.cookies.getAll().map((cookie) => cookie.name),
    );
    if (verdict === "unauthorized") return new NextResponse(null, { status: 401 });
    if (verdict === "sign-in") {
      const target = request.nextUrl.clone();
      target.pathname = SIGN_IN_PATH;
      target.search = "";
      return NextResponse.redirect(target);
    }
  }

  if (!wantsNonce(pathname, isPrefetch(request.headers))) return NextResponse.next();

  const nonce = newNonce();
  const policy = contentSecurityPolicy(nonce, { development: process.env.NODE_ENV === "development" });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    /*
     * Alles behalve de bestanden van Next en een pad dat op de extensie van een bestand eindigt. De
     * lijst staat hier letterlijk, want Next leest deze matcher bij het bouwen en volgt geen
     * variabele; `lib/security/csp-coverage.test.ts` houdt hem gelijk aan `STATIC_FILE_EXTENSIONS`.
     * Een ander pad met een punt (`/iets.x`) is een pagina. Geen uitzondering voor `/api` of voor een
     * prefetch: die komen langs de poort, en `wantsNonce` beslist over de nonce.
     */
    "/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|avif|txt|xml|json|webmanifest|woff|woff2|ttf|otf|map|css|js|pdf)$).*)",
  ],
};
