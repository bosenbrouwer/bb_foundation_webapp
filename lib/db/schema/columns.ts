/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Kolommen die op bijna elke tabel terugkomen.
 *
 * Deze helpers bestaan zodat de conventie op één plek staat en niet vijftien keer wordt overgetypt.
 * Dat is geen cosmetiek: een tabel waar `updated_at` per ongeluk zonder `notNull` staat valt in een
 * code review niet op, maar levert later een overzicht op dat niet kan sorteren op wijzigingsmoment.
 *
 * Gebruik als spread aan het eind van een tabeldefinitie. Elke tabel draagt daarnaast
 * `appRowAccess()` uit `./rls` in het blok met indexen (CLAUDE.md regel 16): zonder die regel is de
 * tabel voor de rol van de app leeg.
 *
 *     export const orders = pgTable(
 *       "orders",
 *       {
 *         id: primaryKeyColumn(),
 *         organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
 *         ...timestamps,
 *         ...softDelete,
 *       },
 *       (t) => [index("orders_organisation_idx").on(t.organisationId), appRowAccess()],
 *     );
 */

import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

/** Primaire sleutel, altijd uuid met gen_random_uuid(). Postgres heeft die functie sinds versie 13 ingebouwd. */
export function primaryKeyColumn() {
  return uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`);
}

/** Elke tabel heeft deze twee. Altijd timestamptz, altijd UTC; zie CLAUDE.md regel 3. */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/**
 * Alleen op tabellen met domeinbetekenis. Verwijderen is zacht, tenzij een besluit in docs/SPEC.md
 * voor een tabel anders zegt; zie CLAUDE.md regel 7.
 */
export const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};
