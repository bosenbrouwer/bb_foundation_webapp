<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Een gesprek met een wegwijzer

**Wanneer.** Een project wil meer dan "één prompt, één voorstel": een vervolgvraag, of één invoerveld
dat op elk scherm iets anders kan. Niet eerder, want een gesprek vraagt geheugen en geheugen is
opslag. In een eerder project is deze vorm gebouwd en alleen tegen een nagemaakt model getest; de
proef tegen de echte API was op 17 november 2026 nog niet gedaan.

**Het patroon.** Twee lagen per beurt, en een knop voor alles wat schrijft.

- **Een wegwijzer op een goedkoop model** kiest een vaardigheid uit een enum. Hij ziet de beurt, de
  laatste zes beurten ingekort, en het scherm als pad zonder id's. Geen gegevens uit de database.
- **Per vaardigheid een eigen witte lijst, eigen schema en eigen toets.** Een nieuwe vaardigheid is
  een nieuw bestand, geen grotere prompt.
- **`other` kost niets:** een vaste tekst, zonder tweede aanroep. Een keuze die de code niet kent,
  wordt `other` (L-AI-06).
- **De twee beurten gaan samen de database in,** na het antwoord en in één transactie. Een aanroep
  die mislukt, laat geen halve beurt achter.
- **Alles is begrensd:** tekens per beurt, beurten per vraag, voorstellen per antwoord, en een grens
  per persoon per uur over alle vaardigheden samen (in het eerdere project veertig: "wie er meer
  doet, is een script").
- **Schrijven gaat via een knop, nooit via een zin.** Het model stelt voor; de server action achter
  de knop toetst opnieuw het recht en de regels en schrijft dan pas. "Ja, doe maar" is in een
  gesprek geen opdracht.
- **Bewaren is een besluit** (L-AI-11). Alleen de persoon zelf leest het: elke query draagt
  `organisation_id` én `user_id` van de actor, geen recht heft dat op, en het id van andermans
  gesprek geeft hetzelfde antwoord als een id dat niet bestaat. Hard weg na de termijn (in het
  eerdere project dertig dagen), in een opruimstap die elke nacht draait, ook als de schakelaar van
  de bewaartermijnen uit staat: een belofte uit de privacyverklaring hangt niet aan een instelling.
  Twee benoemde uitzonderingen: de export per persoon bij een inzageverzoek (achter het recht van de
  eigenaar, in de audit log) en het anonimiseren, dat de gesprekken weggooit. Bewaard worden alleen
  de beurten, niet de achtergrond die naar het model ging.

```ts
// lib/chat/turn.ts (van het project)
const SKILLS = ["explain_order", "draft_request", "other"] as const;

export async function answerTurn(db: Db, actor: Actor, conversationId: string, text: string, screenPath: string): Promise<TurnResult> {
  const room = await consumeRateLimit(db, { organisationId: actor.organisationId, key: `chat:${actor.id}`, limit: 40, windowMinutes: 60 });
  if (!room.ok) return { ok: false, retryMinutes: room.retryMinutes };

  const earlier = await lastTurns(db, actor, conversationId, 6); // filtered on organisation and person
  const routed = await runPrompt(db, actor, "chat_route", { Beurt: text, Scherm: screenPath, Eerder: earlier });
  const skill = enumOr(routed.ok ? routed.proposal["skill"] : undefined, SKILLS, "other");
  const reply = skill === "other" ? FIXED_REPLY : await SKILL_HANDLERS[skill](db, actor, text);

  // Both turns after the answer, in one transaction: a failed call leaves no half turn.
  await db.transaction(async (tx) => {
    const base = { organisationId: actor.organisationId, userId: actor.id, conversationId };
    await tx.insert(chatTurns).values([{ ...base, role: "user", text }, { ...base, role: "assistant", text: reply.text }]);
  });
  return { ok: true, reply };
}
```

**Wat het kost.** Twee aanroepen per beurt. Een tabel met beurten, een leeslaag, een opruimstap die
niet uit kan, een regel in de privacyverklaring (de termijn en wie het leest), en een besluit in
`docs/SPEC.md`: hard verwijderen wijkt af van regel 7 in CLAUDE.md, en bewaren van besluit A4 van de
module (geen inhoud). Een check van het project bewijst de leeslaag (ook een beheerder leest niets
van een ander), de opruimstap, de export en het anonimiseren. Wat een nagemaakt model niet bewijst,
staat in L-AI-07.

**Waar in het template.** Het template heeft dit niet in code; dit is hoe een project het bouwt. De
module ai kent "één prompt, één voorstel" en bewaart geen inhoud. De bouwstenen die het wel levert:
`runPrompt` met per prompt `fields` (de witte lijst), `output` (het schema) en `validateProposal`
(de toets); `enumOr` en `keyed` in `lib/ai/keys.ts`; `PlainText` voor wat het model zegt;
`lib/ai/fake.ts` voor de e2e; `consumeRateLimit` (`lib/domain/rate-limit.ts`); `requireSession`; en
`runSteps` (`lib/cron/steps.ts`), met de opruimstap als eigen stap in `PROJECT_PRUNE_STEPS`.
