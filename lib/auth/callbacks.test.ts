/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import type { Account, User } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROLES } from "./roles.generated";
import type { SyncedUser } from "./user-sync";

/* De rollen van dit project, want elk project heeft andere; en een naam die er zeker niet bij hoort. */
const KNOWN: string = APP_ROLES[0];
const UNKNOWN = "geen-rol-van-dit-project";

/**
 * Geen rol, geen toegang (besluit D26): een inlog zonder een rol die het project kent, krijgt geen
 * sessie en, bij rollen uit het token, ook geen rij. Twee nagemaakte inlogmethoden, één per bron van
 * de rollen; `resolve` telt hoe vaak hij een rij zou maken.
 */
const synced: SyncedUser[] = [];
const resolved: string[] = [];

function provider(id: string, rolesFrom: "token" | "database") {
  return {
    id,
    rolesFrom,
    create: () => {
      throw new Error("niet nodig in deze test");
    },
    resolve: async (user: User): Promise<SyncedUser> => {
      resolved.push(id);
      const row = synced.shift();
      if (row === undefined) throw new Error(`geen rij klaargezet voor ${user.email ?? "onbekend"}`);
      return row;
    },
  };
}

vi.mock("./providers", () => ({
  loginProviderById: (id: string) => (id === "token-bron" ? provider("token-bron", "token") : id === "database-bron" ? provider("database-bron", "database") : undefined),
}));

import { jwtCallback, NoRoleError } from "./callbacks";

function row(roles: string[]): SyncedUser {
  return { id: "00000000-0000-4000-8000-000000000001", organisationId: "00000000-0000-4000-8000-000000000002", displayName: "Iemand", email: "iemand@example.org", initials: "I", roles };
}

const account = (providerId: string): Account => ({ provider: providerId, type: "oidc", providerAccountId: "x" }) as Account;
const user = (roles?: unknown): User => ({ email: "iemand@example.org", ...(roles === undefined ? {} : { roles }) }) as User;

describe("geen rol, geen toegang", () => {
  beforeEach(() => {
    synced.length = 0;
    resolved.length = 0;
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("weigert een token zonder rol voordat er een rij komt", async () => {
    for (const roles of [undefined, [], [UNKNOWN], KNOWN]) {
      await expect(jwtCallback({ token: {}, user: user(roles), account: account("token-bron") })).rejects.toBeInstanceOf(NoRoleError);
    }
    expect(resolved).toEqual([]);
  });

  it("laat een token met een bekende rol door, en houdt alleen de bekende rollen", async () => {
    synced.push(row([]));
    const token = await jwtCallback({ token: {}, user: user([KNOWN, UNKNOWN]), account: account("token-bron") });
    expect(resolved).toEqual(["token-bron"]);
    expect(token).not.toBeNull();
    expect(Object.values(token ?? {})).toContainEqual([KNOWN]);
  });

  it("weigert bij rollen uit de database een rij zonder rol, na het opzoeken", async () => {
    synced.push(row([]));
    await expect(jwtCallback({ token: {}, user: user(), account: account("database-bron") })).rejects.toBeInstanceOf(NoRoleError);
    synced.push(row([UNKNOWN]));
    await expect(jwtCallback({ token: {}, user: user(), account: account("database-bron") })).rejects.toBeInstanceOf(NoRoleError);
    expect(resolved).toEqual(["database-bron", "database-bron"]);
  });

  it("laat bij rollen uit de database een rij met een bekende rol door, en negeert de rollen in het token", async () => {
    synced.push(row([KNOWN]));
    const token = await jwtCallback({ token: {}, user: user([UNKNOWN]), account: account("database-bron") });
    expect(Object.values(token ?? {})).toContainEqual([KNOWN]);
  });

  it("zet geen naam of adres in de waarschuwing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(jwtCallback({ token: {}, user: user([]), account: account("token-bron") })).rejects.toBeInstanceOf(NoRoleError);
    const logged = warn.mock.calls.flat().join(" ");
    expect(logged).toContain("geen rol");
    expect(logged).not.toContain("iemand");
  });
});
