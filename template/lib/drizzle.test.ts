/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { migrationName, pendingSchemaSteps, withDownInFront } from "./drizzle";
import type { ModuleManifest } from "./manifest";

const moduleWith = (schemaVersion: number, migrations: ModuleManifest["migrations"]): ModuleManifest => ({ schemaVersion, migrations }) as ModuleManifest;
const step = (version: number) => ({ down: `modules/x/migrations/${version}/down.sql`, custom: null, customDown: null });

describe("welke schemaversies een project nog mist", () => {
  const twoVersions = moduleWith(2, { "1": step(1), "2": step(2) });

  it("geeft een vers project elke versie, in volgorde", () => {
    expect(pendingSchemaSteps(twoVersions, 0).map((one) => one.version)).toEqual([1, 2]);
  });

  it("geeft een bestaand project alleen wat erbij kwam, en niets als het bij is", () => {
    expect(pendingSchemaSteps(twoVersions, 1).map((one) => one.version)).toEqual([2]);
    expect(pendingSchemaSteps(twoVersions, 2)).toEqual([]);
  });

  it("slaat een versie zonder migratie in het manifest over: die reist met de wortel mee", () => {
    expect(pendingSchemaSteps(moduleWith(2, { "2": step(2) }), 0).map((one) => one.version)).toEqual([2]);
  });
});

describe("de naam van een migratie van een module", () => {
  it("maakt van een koppelteken een liggend streepje en zet custom erachter", () => {
    expect(migrationName("auth-password", 1)).toBe("template_auth_password_1");
    expect(migrationName("core", 2, true)).toBe("template_core_2_custom");
  });
});

describe("de terugweg van een latere schemaversie die in de eerste migratie is opgegaan", () => {
  const first = '-- Terugweg van versie 1.\ndrop table if exists "een";\n';
  const second = '-- Terugweg van versie 2.\ndrop table if exists "twee";\n';
  const third = '-- Terugweg van versie 3.\nalter table "een" drop column if exists "drie";\n';

  it("komt vooraan: eerst terug wat het laatst bijkwam", () => {
    const combined = withDownInFront(first, second);
    expect(combined.indexOf('"twee"')).toBeLessThan(combined.indexOf('"een"'));
    expect(combined.endsWith(first)).toBe(true);
  });

  it("houdt bij drie versies de omgekeerde volgorde aan", () => {
    const combined = withDownInFront(withDownInFront(first, second), third);
    expect([combined.indexOf('"drie"'), combined.indexOf('"twee"'), combined.indexOf("versie 1")]).toEqual([...[combined.indexOf('"drie"'), combined.indexOf('"twee"'), combined.indexOf("versie 1")]].sort((a, b) => a - b));
    expect(combined.indexOf('"drie"')).toBeGreaterThan(-1);
  });

  it("verandert niets als ze er al in staat, zodat een tweede apply geen verschil geeft", () => {
    const once = withDownInFront(first, second);
    expect(withDownInFront(once, second)).toBe(once);
  });

  it("verandert niets bij een lege terugweg", () => {
    expect(withDownInFront(first, "  \n")).toBe(first);
  });
});
