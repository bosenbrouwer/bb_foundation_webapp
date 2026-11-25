<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Niemand beslist over zichzelf

**Wanneer.** Elke stroom waarin de een iets aanvraagt en een ander erover beslist: een aanvraag, een
declaratie, een verzoek om toegang. Wie iets aanvraagt, beslist er niet over, ook de hoogste rol
niet.

**Het patroon.** Eén regel in één bestand, een pure functie, die elk schrijfpad aanroept: goedkeuren,
afwijzen, en elke latere weg waarlangs een besluit kan vallen. De regel staat los van de rechten: het
recht zegt of iemand mag beslissen, de regel zegt dat het niet over de eigen aanvraag gaat. De
vergelijking gaat met `sameId`, want Postgres let niet op hoofdletters en `===` wel. Het overzicht
"te beslissen" laat de eigen aanvragen al in de query weg, maar dat is gemak: de regel in het
schrijfpad is de grens.

```ts
// lib/domain/own-request.ts (van het project)
import { sameId } from "@/lib/domain/ids";

/** Pure: nobody decides on their own request, whatever their role. */
export function mayDecide(actor: { readonly id: string }, request: { readonly requestedBy: string }): boolean {
  return !sameId(actor.id, request.requestedBy);
}

// app/(app)/requests/actions.ts: every write path calls it, after the session and the right
export async function approveRequestAction(requestId: string): Promise<ActionResult> {
  const actor = await requireActor();
  assertCan(actor, "requests:decide");
  const db = getDb();
  const request = await loadRequest(db, actor, requestId);
  if (request === undefined) return { ok: false, message: labels.requests.notFound };
  if (!mayDecide(actor, request)) return { ok: false, message: labels.requests.ownRequest };
  await decide(db, actor, request, "approved"); // writes the audit line in the same transaction
  return { ok: true };
}
```

**Wat het kost.** Een test op de pure regel, en per schrijfpad een bewijs dat het de regel aanroept:
een nieuw pad dat hem vergeet, is het gat. Een gevolg om vooraf te regelen: wie de enige beslisser
is, kan de eigen aanvraag niet afhandelen, dus het project legt vast wie dat dan doet.

**Waar in het template.** Het template heeft dit niet in code; dit is hoe een project het bouwt. De
bouwstenen die het wel levert: `sameId` (`lib/domain/ids.ts`, met de huisregel `same-id`),
`requireActor` en `assertCan`, de audit log in dezelfde transactie (patroon `audit-log`), en een
`check:<domein>` voor het bewijs tegen de database (patroon `checkscript`).
