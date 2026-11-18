/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy, newNonce } from "@/lib/security/csp";

/**
 * Per verzoek een nonce en de CSP die hem noemt. Zie `lib/security/csp.ts` en de besluiten D14 en
 * D17. In Next 16 heet middleware `proxy.ts`.
 *
 * ---
 *
 * **De CSP staat op het verzoek én op het antwoord.** Next leest de nonce uit de CSP-header van het
 * verzoek en zet hem op zijn eigen scripts; de browser leest de header van het antwoord. Zonder de
 * eerste krijgt geen enkel script de nonce en blijft de pagina dood, zonder de tweede is er geen
 * policy. De andere security headers blijven in `lib/config/next-base.ts`: die zijn vast en gelden
 * ook voor `/api` en de statische bestanden. Een tweede CSP daar zou de browser allebei afdwingen.
 *
 * **Alleen pagina's, en een pagina met een punt in het adres is een pagina.** De proxy slaat alleen
 * over wat geen pagina kan zijn: `/api` (cron, bestanden), de bestanden van Next, en een pad dat op
 * de extensie van een bestand eindigt (de lijst hieronder, gelijk aan `STATIC_FILE_EXTENSIONS`).
 * De HTML-pagina's van Auth.js onder `/api/auth` krijgen een vaste CSP zonder scripts uit
 * `lib/config/next-base.ts`. Een prefetch van `next/link` krijgt er geen, zoals de documentatie van
 * Next aanraadt; de scripts die de router daarna invoegt, erven het vertrouwen via
 * `'strict-dynamic'`.
 *
 * **Geen autorisatie hier.** Dit bestand bekijkt geen sessie en weigert niets: dat blijft in
 * `requireSession()` en `can()`, op de plek waar het hoort (CLAUDE.md regel 11).
 */
export function proxy(request: NextRequest): NextResponse {
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
    {
      /*
       * Alles behalve `/api`, de bestanden van Next en een pad dat op de extensie van een bestand
       * eindigt. De lijst staat hier letterlijk, want Next leest deze matcher bij het bouwen en volgt
       * geen variabele; `lib/security/csp-coverage.test.ts` houdt hem gelijk aan
       * `STATIC_FILE_EXTENSIONS`. Een ander pad met een punt (`/iets.x`) is een pagina.
       */
      source: "/((?!api/|_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|avif|txt|xml|json|webmanifest|woff|woff2|ttf|otf|map|css|js|pdf)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
