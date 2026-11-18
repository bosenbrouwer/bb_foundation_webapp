/* template-owned (module auth-entra). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De uitgever van de Entra-login, getoetst bij het opstarten. Puur, zodat hij los te testen is.
 * Besluit D18.
 *
 * **Waarom.** Zonder `AUTH_MICROSOFT_ENTRA_ID_ISSUER` valt de provider van Auth.js terug op
 * `/common/`, en met `common`, `organizations` of `consumers` erin mag elk Microsoft-account van
 * elke tenant het proberen. Of er dan iemand binnenkomt, hangt nog aan de app-registratie (één
 * tenant, toegewezen rollen), maar dat is een instelling in een console die niemand bewaakt. Een
 * vergeten variabele hoort de deur dicht te houden, niet open te zetten.
 *
 * **Een ontbrekende uitgever telt alleen in een deploy** (preview of productie): de build in de CI
 * en de e2e met de dev-login draaien zonder Entra en moeten blijven werken. Een uitgever die naar
 * een verzamelendpoint wijst, is overal fout.
 */
import type { DeployEnvironment } from "@/lib/domain/deploy-environment";

export const ENTRA_ISSUER_ENV = "AUTH_MICROSOFT_ENTRA_ID_ISSUER";

/** Geen tenant maar een verzamelendpoint. `consumers` zijn persoonlijke accounts. */
const MULTI_TENANT = new Set(["common", "organizations", "consumers"]);

/** Wat er mis is met de uitgever, of `undefined` als hij goed is (of in deze omgeving mag ontbreken). */
export function entraIssuerProblem(issuer: string | undefined, environment: DeployEnvironment): string | undefined {
  const value = (issuer ?? "").trim();
  if (value === "") {
    return environment === "production" || environment === "preview"
      ? `${ENTRA_ISSUER_ENV} ontbreekt, en dan valt de login terug op /common/: ieder Microsoft-account mag het dan proberen`
      : undefined;
  }

  const tenant = /^https?:\/\/[^/]+\/([^/]+)/.exec(value)?.[1]?.toLowerCase() ?? "";
  if (MULTI_TENANT.has(tenant)) {
    return `${ENTRA_ISSUER_ENV} wijst naar /${tenant}/ in plaats van naar de eigen tenant, en dan mag ieder Microsoft-account het proberen`;
  }
  return undefined;
}
