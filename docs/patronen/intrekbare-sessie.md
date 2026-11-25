<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Een sessie die in te trekken is

**Wanneer.** Eén sessie moet kunnen eindigen zonder de persoon uit te zetten: uitloggen op afstand,
een noodstop die gebruikers er meteen uit zet, een rol die direct moet veranderen. Het template
heeft een JWT van acht uur en leest per verzoek of de persoon nog aan staat (L-AUTH-03); één sessie
beëindigen kan het niet. Lees dit als ontwerp met code: in een eerder project is het gebouwd, maar
de sessietoets was op 17 november 2026 nog niet tegen een database uitgevoerd.

**Het patroon.** Een tabel `sessions` naast de JWT.

- **De JWT draagt vier velden:** de omgeving, de persoon, de sessie en het begin. Geen naam, geen
  adres, geen rol.
- **Eén query per verzoek:** de sessie bestaat, is niet ingetrokken en niet verlopen, de persoon is
  actief, en dezelfde query geeft de rol en de stand van de omgeving. De rol komt uit de database,
  nooit uit het token.
- **Een cookie van omgeving `a` is op het adres van `b` niets waard,** ook al klopt de handtekening.
  Beide draaien in dezelfde app met hetzelfde geheim, dus de omgeving staat in het token en moet die
  van het adres zijn (patroon `omgeving-per-adres`).
- **Een token is invoer,** ook al heb je het zelf ondertekend (L-AUTH-05).
- **De database dwingt af dat een sessie hoogstens acht uur loopt.**

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations (id),
  user_id uuid not null references users (id),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint sessions_at_most_eight_hours check (expires_at <= started_at + interval '8 hours')
);
```

```ts
// One query per request. Every reason to refuse gives the same answer: not signed in.
const [row] = await db
  .select({ userId: users.id, roles: users.roles })
  .from(sessions)
  .innerJoin(users, eq(users.id, sessions.userId))
  .where(and(eq(sessions.id, token.sessionId), eq(sessions.userId, token.userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, sql`now()`), eq(users.isActive, true), isNull(users.deletedAt)));
if (row === undefined) return undefined;

// Revoking is one update; the next request of that session is refused.
await tx.update(sessions).set({ revokedAt: sql`now()` }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
```

**Wat het kost.** Een tabel, een opruimtaak en een scherm om sessies in te trekken. De query per
verzoek doet het template al voor `is_active`; hij wordt een join breder. Wat het oplevert: uitloggen
op afstand, en een rol die meteen verandert in plaats van bij de volgende inlog.

**Waar in het template.** Het template heeft dit niet in code; dit is hoe een project het bouwt. Of
het later in `core` komt, is een besluit van de eigenaar van het template. De bouwstenen die het wel
levert: `currentActor` in `lib/auth/session.ts` (de ene query per verzoek, via React `cache`),
`lib/auth/session-age.ts` (`SESSION_MAX_AGE_SECONDS`, `sessionExpired`), `lib/auth/token.ts`
(`TOKEN_FIELDS`, `actorFromToken`), `appRowAccess()` voor de nieuwe tabel, de audit log voor het
intrekken, en `runSteps` (`lib/cron/steps.ts`) met het opruimen als eigen stap in
`PROJECT_PRUNE_STEPS`. Let op regel 1 van CLAUDE.md: bij de module auth-entra is de `roles`-claim de
bron van de rol en is `users.roles` een kopie daarvan, bijgewerkt bij elke inlog. "De rol uit de
database" past dus zonder meer bij de wachtwoordlogin; bij Entra verandert een rol nog steeds pas bij
een nieuwe inlog, en is intrekken de manier om die af te dwingen.
