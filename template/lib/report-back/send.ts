/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Een melding als issue bij het template zetten, met de `gh` van wie hem verstuurt. Drie
 * weigeringen voordat er iets weggaat: geen GitHub-adres, een repo die `gh` niet kan lezen, en een
 * repo die openbaar is. Een terugmelding gaat alleen naar een privérepo, want in een openbare leest
 * ook wie niet meedoet.
 *
 * Labels zet de melder niet: GitHub laat labels vallen van wie alleen leesrecht heeft. De titel
 * begint daarom met `[Terugmelding]`, en wie de meldingen toetst, zet de labels.
 */
import { spawnSync } from "node:child_process";

export interface RunResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  /** Het programma kon niet starten, bijvoorbeeld omdat het er niet is. */
  readonly failed: boolean;
}

export type Runner = (command: string, args: readonly string[]) => RunResult;

/** Altijd een argumentenlijst en geen shell, zoals de andere opdrachten van de tooling. */
export function spawnRunner(cwd: string): Runner {
  return (command, args) => {
    const result = spawnSync(command, [...args], { cwd, encoding: "utf8", shell: false });
    return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", failed: result.error !== undefined };
  };
}

/** `eigenaar/repo` uit een git-adres van GitHub, of undefined als het geen GitHub-adres is. */
export function githubRepo(url: string | null | undefined): string | undefined {
  if (url === null || url === undefined) return undefined;
  const match = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(url.trim());
  return match === null ? undefined : `${match[1] ?? ""}/${match[2] ?? ""}`;
}

/** De pagina voor een nieuw issue met de titel al ingevuld, voor wie geen `gh` heeft. */
export function newIssueUrl(repo: string, title: string): string {
  return `https://github.com/${repo}/issues/new?title=${encodeURIComponent(title)}`;
}

export type SendOutcome =
  | { readonly kind: "sent"; readonly issue: string; readonly url: string }
  | { readonly kind: "no-gh" }
  | { readonly kind: "refused"; readonly reason: string };

function firstLine(text: string): string {
  return text.trim().split(/\r?\n/)[0] ?? "";
}

export function sendIssue(repo: string, title: string, bodyFile: string, run: Runner): SendOutcome {
  if (run("gh", ["--version"]).failed) return { kind: "no-gh" };

  const view = run("gh", ["repo", "view", repo, "--json", "visibility", "--jq", ".visibility"]);
  if (view.failed || view.status !== 0) {
    return {
      kind: "refused",
      reason: `gh kon ${repo} niet lezen (${firstLine(view.stderr) || "geen uitleg"}). Ben je aangemeld (gh auth login) met een account dat bij het template kan?`,
    };
  }
  const visibility = view.stdout.trim().toUpperCase();
  if (visibility === "PUBLIC") {
    return { kind: "refused", reason: `${repo} is openbaar. Een terugmelding gaat alleen naar een privérepo, want in een openbare leest ook wie niet meedoet.` };
  }
  if (visibility !== "PRIVATE" && visibility !== "INTERNAL") {
    return { kind: "refused", reason: `gh gaf een onbekende zichtbaarheid voor ${repo}: "${visibility}". Er is niets verstuurd.` };
  }

  const create = run("gh", ["issue", "create", "--repo", repo, "--title", title, "--body-file", bodyFile]);
  if (create.failed || create.status !== 0) {
    return { kind: "refused", reason: `gh issue create lukte niet (${firstLine(create.stderr) || "geen uitleg"}). Er is niets verstuurd.` };
  }
  const url = create.stdout.split(/\s+/).find((part) => /\/issues\/\d+$/.test(part)) ?? create.stdout.trim();
  const number = /\/issues\/(\d+)$/.exec(url)?.[1];
  return { kind: "sent", issue: number === undefined ? "?" : `#${number}`, url };
}
