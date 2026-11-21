/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { githubRepo, newIssueUrl, sendIssue, type RunResult, type Runner } from "./send";

const ok = (stdout = ""): RunResult => ({ status: 0, stdout, stderr: "", failed: false });
const fail = (stderr: string): RunResult => ({ status: 1, stdout: "", stderr, failed: false });

function fakeGh(responses: { visibility?: RunResult; create?: RunResult; missing?: boolean }): { run: Runner; calls: string[][] } {
  const calls: string[][] = [];
  const run: Runner = (command, args) => {
    calls.push([command, ...args]);
    if (responses.missing === true) return { status: null, stdout: "", stderr: "", failed: true };
    if (args[0] === "--version") return ok("gh version 2.0.0");
    if (args[0] === "repo") return responses.visibility ?? ok("PRIVATE\n");
    if (args[0] === "issue") return responses.create ?? ok("https://github.com/organisatie/template/issues/12\n");
    return fail("onverwacht");
  };
  return { run, calls };
}

describe("het adres van het template", () => {
  it("haalt eigenaar en repo uit elke vorm van een GitHub-adres", () => {
    expect(githubRepo("https://github.com/organisatie/template.git")).toBe("organisatie/template");
    expect(githubRepo("git@github.com:organisatie/template.git")).toBe("organisatie/template");
    expect(githubRepo("ssh://git@github.com/organisatie/template")).toBe("organisatie/template");
    expect(githubRepo("https://gitlab.com/organisatie/template.git")).toBeUndefined();
    expect(githubRepo(null)).toBeUndefined();
  });

  it("maakt de pagina voor een nieuw issue met de titel erin", () => {
    expect(newIssueUrl("organisatie/template", "[Terugmelding] 1 punt")).toBe("https://github.com/organisatie/template/issues/new?title=%5BTerugmelding%5D%201%20punt");
  });
});

describe("het versturen", () => {
  it("zet een issue in een privérepo en geeft het nummer terug", () => {
    const { run, calls } = fakeGh({});
    expect(sendIssue("organisatie/template", "[Terugmelding] 1 punt", "melding.md", run)).toEqual({
      kind: "sent",
      issue: "#12",
      url: "https://github.com/organisatie/template/issues/12",
    });
    expect(calls[2]).toEqual(["gh", "issue", "create", "--repo", "organisatie/template", "--title", "[Terugmelding] 1 punt", "--body-file", "melding.md"]);
  });

  it("weigert een openbare repo zonder iets aan te maken", () => {
    const { run, calls } = fakeGh({ visibility: ok("PUBLIC\n") });
    const outcome = sendIssue("organisatie/template", "t", "melding.md", run);
    expect(outcome.kind).toBe("refused");
    expect(calls.some((call) => call[1] === "issue")).toBe(false);
  });

  it("weigert als gh de repo niet kan lezen, of een onbekende zichtbaarheid geeft", () => {
    expect(sendIssue("organisatie/template", "t", "m", fakeGh({ visibility: fail("HTTP 404: Not Found") }).run)).toMatchObject({ kind: "refused" });
    expect(sendIssue("organisatie/template", "t", "m", fakeGh({ visibility: ok("") }).run)).toMatchObject({ kind: "refused" });
  });

  it("zegt het als gh er niet is, en als het aanmaken mislukt", () => {
    expect(sendIssue("organisatie/template", "t", "m", fakeGh({ missing: true }).run)).toEqual({ kind: "no-gh" });
    expect(sendIssue("organisatie/template", "t", "m", fakeGh({ create: fail("GraphQL: Could not resolve") }).run)).toMatchObject({ kind: "refused" });
  });
});
