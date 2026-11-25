<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Accounts van buiten

**Wanneer.** Mensen loggen in met een Microsoft-account uit een tenant die niet de jouwe is, via de
uitgever `common`. Niet voor een tool met één eigen tenant: daar beperkt de uitgever de inlog
(L-ENTRA-01). Lees het als ontwerp met code. In een eerder project is het gebouwd en getoetst op
alles wat puur is, maar de migratie, de toelating en de sessietoets waren op 17 november 2026 nog
niet tegen een database uitgevoerd.

**Het patroon.** Het mailadres uit een token is geen bewijs: een beheerder van een andere tenant zet
er elk adres in (L-AUTH-09). Toegang hangt daarom aan iets anders.

- **Een uitnodiging per persoon:** 32 willekeurige bytes, alleen de hash in de database, zeven dagen
  geldig, één keer te gebruiken. De link is er alleen op het moment van maken.
- **Het account wordt vastgepind** bij de eerste inlog: het paar uitgever en `sub`. Daarna is alleen
  dat account die persoon. Naam en adres worden getoond en nergens vergeleken; een test bewijst dat
  hetzelfde adres met een andere `sub` er niet in komt.
- **De claim is atomair:** van twee gelijktijdige claims wint er precies één.
- **Het token van de uitnodiging reist in een cookie, niet in een adres,** tijdens de omweg langs
  Microsoft: httpOnly, `SameSite=Lax`, `__Host-` buiten lokaal, een kwartier geldig, en weg na de
  toelating, wat de uitkomst ook was.
- **Elke weigering toont dezelfde pagina zonder reden.** De reden staat alleen in het logboek.
- **Toets tenant en uitgever zelf.** Bij `common` leidt Auth.js de verwachte uitgever af uit het
  token dat hij moet toetsen (L-AUTH-08). Dus nog een keer, in eigen code: de tenant is een GUID, de
  uitgever is exact die van die tenant, de `sub` is niet leeg.
- **De provider vraagt weinig en toetst alles:** alleen `openid profile email` (geen aanroep naar
  Graph), `prompt=select_account`, en `checks: ["pkce", "state", "nonce"]` (L-AUTH-10).

```sql
-- of two simultaneous claims exactly one wins; the row is pinned to issuer and subject
update invitations
set claimed_at = now(), issuer = $2, subject = $3
where token_hash = $1 and claimed_at is null and expires_at > now()
returning id, person_id;
```

```ts
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pure: one tenant as a GUID, exactly the issuer of that tenant, and a subject. No address. */
export function pinnedAccount(claims: { readonly tid?: unknown; readonly iss?: unknown; readonly sub?: unknown }): { issuer: string; subject: string } | undefined {
  if (typeof claims.tid !== "string" || !GUID.test(claims.tid)) return undefined;
  const issuer = `https://login.microsoftonline.com/${claims.tid}/v2.0`;
  if (claims.iss !== issuer) return undefined;
  if (typeof claims.sub !== "string" || claims.sub === "") return undefined;
  return { issuer, subject: claims.sub };
}
```

**Wat het kost.** Een tabel met uitnodigingen en een scherm om ze te maken, limieten per adres van
de aanroeper op het openen van een uitnodiging en op de inlog (patroon `omgeving-per-adres`), en een
eigen inlogprovider: de module auth-entra is voor één tenant. De toets leunt op een regel in andermans
code, dus bij elke nieuwe versie van Auth.js lees je die bron opnieuw. Een tweede factor is van het
account van de gebruiker: dat spreek je af, dat bouw je niet.

**Waar in het template.** Het template heeft dit niet in code; dit is hoe een project het bouwt. De
module auth-entra weigert juist te starten op `common` (`entraIssuerProblem` in
`lib/auth/providers/entra-issuer.ts`) en zet `checks` niet om. De bouwstenen die het wel levert:
`consumeRateLimit` met `callerAddress` (`lib/domain/rate-limit.ts`), de identiteit als vast id en
nooit als adres (`lib/auth/providers/entra-identity.ts`, `lib/auth/user-sync.ts`, L-AUTH-06), de
dev-login voor lokaal en de e2e, en in de module auth-password een eenmalig token waarvan alleen de
hash wordt bewaard (`lib/auth/password/tokens.ts`).
