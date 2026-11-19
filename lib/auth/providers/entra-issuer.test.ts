/* template-owned (module auth-entra). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { entraIssuerProblem } from "./entra-issuer";

const TENANT = "https://login.microsoftonline.com/3f0c1a52-7b1e-4c7e-9d51-6a1f2b3c4d5e/v2.0";

describe("de uitgever van de Entra-login", () => {
  it("vindt niets mis aan een uitgever met de eigen tenant erin", () => {
    for (const environment of ["local", "preview", "production", "unknown"] as const) {
      expect(entraIssuerProblem(TENANT, environment)).toBeUndefined();
    }
  });

  it("weigert een uitgever die de tenant bij zijn domeinnaam noemt: dan wordt de tenant niet getoetst", () => {
    for (const environment of ["production", "preview", "local", "unknown"] as const) {
      expect(entraIssuerProblem("https://login.microsoftonline.com/voorbeeld.onmicrosoft.com/v2.0", environment), environment).toMatch(/niet bij zijn id/);
    }
  });

  it("weigert een ontbrekende uitgever in een deploy", () => {
    expect(entraIssuerProblem(undefined, "production")).toMatch(/ontbreekt/);
    expect(entraIssuerProblem("  ", "preview")).toMatch(/ontbreekt/);
  });

  it("laat een ontbrekende uitgever toe waar geen deploy draait: de CI-build en de e2e met de dev-login", () => {
    expect(entraIssuerProblem(undefined, "local")).toBeUndefined();
    expect(entraIssuerProblem("", "unknown")).toBeUndefined();
  });

  it("weigert een verzamelendpoint overal, ook lokaal", () => {
    for (const tenant of ["common", "organizations", "consumers", "COMMON"]) {
      for (const environment of ["local", "preview", "production", "unknown"] as const) {
        expect(entraIssuerProblem(`https://login.microsoftonline.com/${tenant}/v2.0`, environment), `${tenant} ${environment}`).toMatch(/in plaats van naar de eigen tenant/);
      }
    }
  });
});
