/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { onlyTemplateSourceChanged, parseLsRemoteTags } from "./git";

describe("onlyTemplateSourceChanged", () => {
  const SOURCE = "https://github.com/voorbeeld/template.git";
  const base = { project: { slug: "voorbeeld" }, modules: ["jobs"], template: { skipDependencies: [], keepCrons: [] } };
  const json = (value: unknown, indent = 2): string => `${JSON.stringify(value, null, indent)}\n`;

  it("ja als alleen de bron erbij komt, ook zonder sleutel source ervoor", () => {
    expect(onlyTemplateSourceChanged(json(base), json({ ...base, template: { ...base.template, source: SOURCE } }))).toBe(true);
  });

  it("ja als de bron van null een adres wordt, of van het ene adres naar het andere", () => {
    const withNull = { ...base, template: { source: null, ...base.template } };
    expect(onlyTemplateSourceChanged(json(withNull), json({ ...base, template: { ...base.template, source: SOURCE } }))).toBe(true);
    expect(onlyTemplateSourceChanged(json({ ...base, template: { ...base.template, source: SOURCE } }), json({ ...base, template: { ...base.template, source: `${SOURCE}x` } }))).toBe(true);
  });

  it("ja als alleen de opmaak of de volgorde van de sleutels anders is", () => {
    const reordered = { template: { keepCrons: [], source: SOURCE, skipDependencies: [] }, modules: ["jobs"], project: { slug: "voorbeeld" } };
    expect(onlyTemplateSourceChanged(json(base), json(reordered, 4))).toBe(true);
  });

  it("ja als het blok template er eerst niet was en nu alleen de bron draagt", () => {
    const { template: _template, ...withoutTemplate } = base;
    expect(onlyTemplateSourceChanged(json(withoutTemplate), json({ ...withoutTemplate, template: { source: SOURCE } }))).toBe(true);
  });

  it("nee zodra er naast de bron iets anders verandert", () => {
    expect(onlyTemplateSourceChanged(json(base), json({ ...base, modules: ["jobs", "files"], template: { ...base.template, source: SOURCE } }))).toBe(false);
    expect(onlyTemplateSourceChanged(json(base), json({ ...base, template: { ...base.template, keepCrons: ["/api/cron/jobs"], source: SOURCE } }))).toBe(false);
    expect(onlyTemplateSourceChanged(json(base), json({ ...base, modules: ["files", "jobs"] }))).toBe(false);
  });

  it("nee als een van de twee geen geldige JSON is", () => {
    expect(onlyTemplateSourceChanged("{", json(base))).toBe(false);
    expect(onlyTemplateSourceChanged(json(base), "")).toBe(false);
  });
});

describe("parseLsRemoteTags", () => {
  it("leest de tags en laat de ^{}-verwijzingen weg", () => {
    const stdout = [
      "0123456789abcdef0123456789abcdef01234567\trefs/tags/v1.0.0",
      "89abcdef0123456789abcdef0123456789abcdef\trefs/tags/v1.0.0^{}",
      "fedcba9876543210fedcba9876543210fedcba98\trefs/tags/v1.1.0",
      "",
    ].join("\n");
    expect(parseLsRemoteTags(stdout)).toEqual(["v1.0.0", "v1.1.0"]);
    expect(parseLsRemoteTags("")).toEqual([]);
  });
});
