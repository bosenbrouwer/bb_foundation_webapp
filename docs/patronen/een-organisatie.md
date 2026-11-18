<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Eén organisatie

**Wanneer.** Altijd. Het template is multi-tenant-ready en niet multi-tenant.

**Het patroon.** `organisation_id` staat op elke tabel met domeinbetekenis en de data-access laag
geeft hem verplicht mee, uit de actor en nooit uit de request. Tegelijk staat er een unieke index
die precies één rij in `organisations` toestaat, zodat niemand per ongeluk een tweede tenant
aanmaakt zonder er over nagedacht te hebben. Komt er ooit een tweede, dan is dat één migratie (de
index weg) en nul queries, want elke query filtert al.

```ts
export const members = pgTable("members", {
  id: primaryKeyColumn(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  ...timestamps,
  ...softDelete,
}, (t) => [index("members_organisation_idx").on(t.organisationId), appRowAccess()]);

export async function listMembers(db: DbOrTransaction, actor: Actor): Promise<Member[]> {
  assertCan(actor, "members:read");
  return db.select().from(members).where(and(eq(members.organisationId, actor.organisationId), isNull(members.deletedAt)));
}
```

```sql
-- migratie 0001_core_guards
create unique index one_organisation on organisations ((true));
```

**Wat het kost.** Een kolom en een voorwaarde per query, die je toch al wilt. Geen huisregel
bewaakt die voorwaarde: de leesfunctie krijgt de actor en filtert zelf, en de check van het domein
bewijst het. Schrijf je het filter in een subquery, let dan op de huisregel `subquery-columns`: een
kolom van de buitenste tabel staat in een `sql`-fragment met een subquery uitgeschreven met de
tabelnaam ervoor (`members.organisation_id`), niet als `${members.organisationId}`, want zonder join
wijst die stil naar de tabel van de subquery zelf. `appRowAccess()` in het voorbeeld is het slot uit
regel 16 van `CLAUDE.md`: de rol van de app mag alle rijen, en zonder die regel is de tabel voor de
app leeg.

**Waar in het template.** `lib/db/schema/organisations.ts`, de index in `0001_core_guards`,
`pnpm check:core` sectie 2 (een tweede organisatie wordt geweigerd), en `requireCron` dat de ene
organisatie aan een cron geeft.
