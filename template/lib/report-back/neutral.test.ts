/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { readDefaultConfig } from "../apply";
import type { ProjectConfig } from "../config-schema";
import { loadManifest } from "../manifest";
import { forbiddenNames, neutralityProblems } from "./neutral";

const root = process.cwd();
const defaults = readDefaultConfig(root, loadManifest(root));

function projectConfig(): ProjectConfig {
  const config = structuredClone(defaults);
  return {
    ...config,
    project: {
      ...config.project,
      name: "Zonnebloem Planner",
      shortName: "Zonnebloem",
      slug: "zonnebloem-planner",
      organisation: { ...config.project.organisation, name: "Stichting Voorbeeldnaam", mailDomain: "voorbeeldnaam.nl" },
      productionUrl: "https://planner.voorbeeldnaam.nl",
    },
  };
}

describe("de namen die nooit in een terugmelding mogen", () => {
  it("komen uit de config, behalve waar het project nog de neutrale standaard heeft", () => {
    const names = forbiddenNames(projectConfig(), defaults, ["Klant B", "ab"]);
    expect(names).toEqual(expect.arrayContaining(["Zonnebloem Planner", "Zonnebloem", "zonnebloem-planner", "Stichting Voorbeeldnaam", "voorbeeldnaam.nl", "planner.voorbeeldnaam.nl", "Klant B"]));
    expect(names).not.toContain("ab");
    expect(forbiddenNames(defaults, defaults, [])).toEqual([]);
  });
});

describe("de controle op neutraliteit", () => {
  const names = forbiddenNames(projectConfig(), defaults, ["Klant B"]);

  it("vindt een naam los van hoofdletters, maar niet midden in een ander woord", () => {
    const problems = neutralityProblems("Regel 1\nbij zonnebloem ging het mis\nde Zonnebloemen bloeiden\nklant b belde", names);
    expect(problems.map((problem) => problem.line)).toEqual([2, 4]);
    expect(problems[0]?.what).toContain('"Zonnebloem"');
  });

  it("vindt adressen, nummers en verbindingen, en laat voorbeeldwaarden staan", () => {
    const text = [
      "mail iemand@voorbeeldnaam-elders.nl",
      "mail iemand@example.org en dev@voorbeeld.invalid",
      "tenant 3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      "rij 00000000-0000-4000-8000-000000000001",
      /* In stukken, zodat de geheimenscan van deze repo de test zelf niet aanwijst. */
      ["postgresql", "://", "gebruiker:geheim", "@host/db"].join(""),
      "server 10.1.2.3 en lokaal 127.0.0.1, versie 1.10.0",
      "preview zonnig-project-abc.vercel.app",
      "ep-cool-darkness-123456.eu-central-1.aws.neon.tech",
      "site contoso-achtig.sharepoint.com",
    ].join("\n");
    const problems = neutralityProblems(text, []);
    expect(problems.map((problem) => [problem.line, problem.what])).toEqual([
      [1, "een e-mailadres"],
      [3, "een GUID (van een tenant, een app of een rij)"],
      [5, "een verbindingsstring"],
      [6, "een IP-adres"],
      [7, "een adres bij Vercel met de naam van een project"],
      [8, "een endpoint van Neon"],
      [9, "een tenant of site van Microsoft"],
    ]);
    expect(problems.some((problem) => problem.what.includes("geheim@host"))).toBe(false);
  });

  it("vindt niets in een neutrale les", () => {
    const text = "## Les P-01: een pool zonder luisteraar\n\n**Regel.** Elke pool krijgt een luisteraar op `error`, zie https://neon.tech/docs.";
    expect(neutralityProblems(text, names)).toEqual([]);
  });
});
