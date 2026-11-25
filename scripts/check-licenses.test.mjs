/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { bindsCopyleft, judgeLicense } from "./check-licenses.mjs";

describe("het oordeel over een licentie", () => {
  it("laat de gangbare vrije licenties door, en LGPL ook", () => {
    for (const license of ["MIT", "Apache-2.0", "ISC", "BSD-3-Clause", "0BSD", "MPL-2.0", "LGPL-3.0-or-later", "(MIT OR Apache-2.0)"]) {
      expect(judgeLicense(license), license).toBe("ok");
    }
  });

  it("weigert elke vorm van GPL en AGPL, ook met een uitzondering erachter", () => {
    for (const license of ["GPL-2.0", "GPL-2.0-only", "GPL-3.0-or-later", "GPL-2.0+", "AGPL-3.0", "GPLv3", "GPL-2.0-only WITH Classpath-exception-2.0"]) {
      expect(judgeLicense(license), license).toBe("copyleft");
    }
  });

  it("leest een keuze als een keuze en een combinatie als allebei", () => {
    expect(bindsCopyleft("MIT OR GPL-3.0")).toBe(false);
    expect(bindsCopyleft("GPL-2.0 OR AGPL-3.0")).toBe(true);
    expect(bindsCopyleft("MIT AND GPL-3.0")).toBe(true);
    expect(bindsCopyleft("(MIT OR GPL-3.0) AND Apache-2.0")).toBe(false);
  });

  it("noemt een lege of eigen licentie onbekend, en een onleesbare tekst met GPL erin een fout", () => {
    for (const license of ["", "UNLICENSED", "SEE LICENSE IN LICENSE.md", "Custom: zie de website"]) {
      expect(judgeLicense(license), license).toBe("unknown");
    }
    expect(judgeLicense("GPL-3.0 License")).toBe("copyleft");
    expect(judgeLicense("Vrij te gebruiken")).toBe("unknown");
  });
});
