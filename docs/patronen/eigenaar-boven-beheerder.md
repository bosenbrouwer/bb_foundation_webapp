<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Een eigenaar boven de beheerder

**Wanneer.** De beheerder doet het dagelijkse beheer, maar hoort niet over de sleutels van de
organisatie te gaan: instellingen, toegang, privacy, koppelingen. "De sleutels van de organisatie
horen bij wie het bedrijf bezit."

**Het patroon.** Een rol boven de beheerder. De sleutels staan in één lijst `OWNER_ONLY` in de
rechtenmatrix, zodat op één plek te lezen is wat alleen de eigenaar mag, en er is een plafond op wie
welke rol mag uitdelen. Het werkt alleen als elk beheerscherm een eigen recht heeft: "een recht dat
twee dingen betekent, geeft bij de volgende die het anders toekent het ene per ongeluk mee met het
andere".

```ts
// lib/auth/matrix.ts (van het project)
export const OWNER_ONLY: readonly Action[] = ["admin:access", "admin:settings", "admin:privacy", "admin:integrations"];

export const MATRIX: Readonly<Record<AppRole, readonly Action[]>> = {
  owner: [...ACTIONS],
  manager: ACTIONS.filter((action) => !OWNER_ONLY.includes(action)),
  member: ["orders:read"],
};

/** The ceiling, as an example: having the right is not enough, nobody hands out a role above their own. */
const RANK: Readonly<Record<AppRole, number>> = { owner: 2, manager: 1, member: 0 };
export function mayGrant(actor: RoleHolder, role: AppRole): boolean {
  return actor.roles.some((own) => RANK[own] >= RANK[role]);
}

// lib/auth/matrix.test.ts
it("keeps the keys of the organisation with the owner", () => {
  for (const role of APP_ROLES.filter((candidate) => candidate !== "owner")) {
    for (const action of OWNER_ONLY) expect(can({ roles: [role] }, action), `${role} ${action}`).toBe(false);
  }
});
```

**Wat het kost.** Een rechtenronde: bij elk bestaand `admin:`-recht de vraag of het dagelijks beheer
is of een sleutel, en een recht dat twee dingen betekent eerst splitsen. Een derde rol in
`project.config.json`, en bij Entra een app role in de tenant met exact dezelfde waarde. In een
project uit dit template eist `lib/auth/can.test.ts` dat elke rol met `admin: true` alles mag: alleen
de eigenaar krijgt dus `admin: true`, en de beheerder wordt een gewone rol met een lange regel in de
matrix. De bewaking van "de laatste beheerder" in de wachtwoordlogin bewaakt daarmee de laatste
eigenaar.

**Waar in het template.** Het template heeft dit niet in code; dit is hoe een project het bouwt. Het
kent `admin` en `member`, en `core` krijgt geen derde rol. De bouwstenen die het wel levert:
`lib/auth/matrix.ts` en `lib/auth/actions.ts` (van het project), `can` en `assertCan`
(`lib/auth/can.ts`), `pnpm template:generate` voor de rollen, en een eigen recht per tabblad onder
Beheer (patroon `project-tabblad-onder-beheer`). Het plafond op uitdelen bouwt het project zelf: bij
de wachtwoordlogin vraagt het wijzigen van rollen alleen `admin:access` (`lib/auth/password/admin.ts`
in de module auth-password), bij Entra deelt de tenant de rollen uit en is het plafond een afspraak
over wie daar app roles mag toekennen.
