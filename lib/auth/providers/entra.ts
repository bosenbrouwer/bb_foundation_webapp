/* template-owned (module auth-entra). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Microsoft Entra ID.
 *
 * De provider leest zijn drie waarden zelf uit de omgeving: AUTH_MICROSOFT_ENTRA_ID_ID, _SECRET en
 * _ISSUER. Die laatste bepaalt de tenant en is dus wat de login beperkt tot de organisatie. Ontbreekt
 * hij, dan valt de provider terug op `/common/` en mag ieder Microsoft-account inloggen.
 *
 * **Daarom start een deploy niet zonder die uitgever**, en nergens met `common`, `organizations` of
 * `consumers` erin (besluit D18, `entra-issuer.ts`). De fout komt bij het maken van de provider, dus
 * bij het opstarten en bij de build op de host: een vergeten variabele geeft een mislukte deploy in
 * plaats van een inlog die voor iedereen openstaat.
 */

import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import type { Provider } from "next-auth/providers";
import { deployEnvironment } from "@/lib/domain/deploy-environment";
import { ENTRA_ISSUER_ENV, entraIssuerProblem } from "./entra-issuer";
import { entraUserFromProfile } from "./entra-profile";

export const ENTRA_PROVIDER_ID = "microsoft-entra-id";

export function entraProvider(): Provider {
  const problem = entraIssuerProblem(process.env[ENTRA_ISSUER_ENV], deployEnvironment());
  if (problem !== undefined) {
    throw new Error(`${problem}. Zet https://login.microsoftonline.com/<tenant-id>/v2.0, zie docs/handleiding/05-entra.md.`);
  }

  return MicrosoftEntraID({
    /**
     * De standaard-profile van deze provider haalt een profielfoto bij Graph op en zet die als base64
     * in de sessie. Dat blaast de sessiecookie op en kost een extra Graph-call bij elke login, terwijl
     * de rail initialen gebruikt. Dus overschreven.
     *
     * De roles-claim wordt hier meegenomen, want dit is het enige punt waar het Entra-token nog
     * beschikbaar is. Verder in de flow bestaat alleen nog onze eigen JWT.
     */
    profile(profile) {
      return entraUserFromProfile(profile);
    },
  });
}
