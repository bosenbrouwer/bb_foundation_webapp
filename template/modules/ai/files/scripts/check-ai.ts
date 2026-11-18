/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm check:ai`: de sloten van de module ai, tegen de dev-branch, alles teruggedraaid. De catalogus
 * is consistent, een prompt staat uit tot een beheerder hem aanzet met een model, prijzen worden centen
 * met een auditregel, de daglimiet telt per persoon per prompt per dag, de kosten van een maand kloppen
 * tot op de centtoken, en wie het recht niet heeft, komt nergens bij.
 *
 * Deze check roept de API niet aan: dat kost geld. Hij haalt de sleutel eerst uit de omgeving, zodat
 * een echte aanroep niet eens kan. Een proef met de echte sleutel: pnpm ai:test.
 *
 * Rubriek 7 is de smokkeltest tegen de database: voor elk geval uit `check-ai.project.ts` bouwt hij
 * de waarden zoals de server action dat doet, en eist hij dat wat verboden is, niet in het bericht
 * naar het model staat (docs/modules/ai.md, les L-AI-02).
 */
import { and, eq } from "drizzle-orm";
import { AI_KEY_ENV } from "../lib/ai/client";
import { centTokens } from "../lib/ai/cost";
import { outgoingText, smuggled } from "../lib/ai/outgoing";
import { AI_PROMPTS, catalogueProblems, promptFor } from "../lib/ai/prompts";
import { loadPrices, loadPromptSettings, mergePromptSettings, savePrice, savePromptSetting } from "../lib/ai/settings";
import { countToday, logRequest, monthTotals, recentRequests } from "../lib/ai/usage";
import type { Actor } from "../lib/auth/actor";
import { ADMIN_ROLES } from "../lib/auth/roles";
import { auditLog } from "../lib/db/schema";
import { labels } from "../lib/i18n/labels";
import { AI_SMUGGLE_CASES } from "./check-ai.project";
import { createChecker, inRollback, requireContext } from "./lib/check";
import { scriptDb, withDirectDb } from "./lib/connection";
import { runScript } from "./lib/run";

function refuses(run: () => Promise<unknown>): Promise<boolean> {
  return run().then(
    () => false,
    () => true,
  );
}

/* Geen echte aanroep vanuit een check, ook niet per ongeluk: zonder sleutel kan hij niet eens. */
delete process.env[AI_KEY_ENV];

runScript(async () => {
  await withDirectDb(async (pool) => {
    const db = scriptDb(pool);
    const ctx = await requireContext(db);
    const t = createChecker();
    const admin: Actor = { id: ctx.userId, organisationId: ctx.organisationId, name: "Check", email: ctx.email, initials: "CK", roles: [...ADMIN_ROLES] };
    const nobody: Actor = { ...admin, roles: [] };
    const day = "2026-10-15";
    const request = { organisationId: ctx.organisationId, userId: ctx.userId, promptKey: "check_prompt", promptVersion: 1, model: "check-model", inputTokens: 0, outputTokens: 0, inputCentsPerMtok: null, outputCentsPerMtok: null, currency: null, durationMs: 10, day, error: null };

    t.section("1. De catalogus is consistent");
    t.check("geen problemen in de catalogus", catalogueProblems(), []);
    t.ok("zonder rij staat elke prompt uit, zonder model", mergePromptSettings([]).every((setting) => !setting.enabled && setting.model === null));

    t.section("2. Instellingen per prompt");
    const first = AI_PROMPTS[0];
    if (first === undefined) {
      console.log("  --    de catalogus is leeg; sla de instellingen per prompt over");
    } else {
      await inRollback(db, async (tx) => {
        const input = { promptKey: first.key, enabled: true, model: "", effort: "low", dailyLimit: "5" };
        const withoutModel = await savePromptSetting(tx, admin, input, labels.ai.settingErrors);
        t.check("aan zonder model wordt geweigerd", withoutModel, { ok: false, errors: { model: labels.ai.settingErrors.modelRequired } });
        const bad = await savePromptSetting(tx, admin, { ...input, model: "claude haiku" }, labels.ai.settingErrors);
        t.check("een model-id met een spatie wordt geweigerd", bad.ok, false);
        const saved = await savePromptSetting(tx, admin, { ...input, model: "claude-haiku-5-5" }, labels.ai.settingErrors);
        t.check("een goede instelling wordt bewaard", saved, { ok: true });
        const stored = (await loadPromptSettings(tx, ctx.organisationId)).find((setting) => setting.promptKey === first.key);
        t.check("en staat erin", [stored?.enabled, stored?.model, stored?.dailyLimit, stored?.isDefault], [true, "claude-haiku-5-5", 5, false]);
        const audit = await tx.select({ action: auditLog.action }).from(auditLog).where(and(eq(auditLog.entityTable, "ai_prompt_settings"), eq(auditLog.entityId, ctx.organisationId)));
        t.ok("met een auditregel", audit.length >= 1);
        t.ok("zonder het recht admin:ai geweigerd", await refuses(() => savePromptSetting(tx, nobody, { ...input, model: "claude-haiku-5-5" }, labels.ai.settingErrors)));
      });
    }

    t.section("3. Prijzen: centen per miljoen tokens, met een auditregel");
    await inRollback(db, async (tx) => {
      t.check("een prijs met drie decimalen wordt geweigerd", (await savePrice(tx, admin, { model: "check-model", input: "0,105", output: "1" }, labels.ai.priceErrors)).ok, false);
      t.check("een goede prijs wordt bewaard", await savePrice(tx, admin, { model: "check-model", input: "0,10", output: "0.50" }, labels.ai.priceErrors), { ok: true });
      const price = (await loadPrices(tx, ctx.organisationId)).find((row) => row.model === "check-model");
      t.check("als centen in dollars", [price?.inputCentsPerMtok, price?.outputCentsPerMtok, price?.currency], [10, 50, "USD"]);
      const audit = await tx.select({ action: auditLog.action }).from(auditLog).where(eq(auditLog.entityTable, "ai_model_prices"));
      t.ok("met een auditregel", audit.length >= 1);
      t.ok("zonder het recht admin:ai geweigerd", await refuses(() => savePrice(tx, nobody, { model: "check-model", input: "1", output: "1" }, labels.ai.priceErrors)));
    });

    t.section("4. De daglimiet telt per persoon, per prompt, per dag, ook wat misging");
    await inRollback(db, async (tx) => {
      await logRequest(tx, { ...request, status: "ok" });
      await logRequest(tx, { ...request, status: "failed", error: "check" });
      await logRequest(tx, { ...request, promptKey: "other_prompt", status: "ok" });
      await logRequest(tx, { ...request, day: "2026-10-14", status: "ok" });
      t.check("twee op die dag voor deze prompt", await countToday(tx, ctx.organisationId, ctx.userId, "check_prompt", day), 2);
    });

    t.section("5. De kosten van een maand kloppen tot op de centtoken");
    await inRollback(db, async (tx) => {
      /* Wat er al stond telt niet mee: de check kijkt naar het verschil. */
      const usd = (totals: Awaited<ReturnType<typeof monthTotals>>) => totals.costs.find((cost) => cost.currency === "USD")?.centTokens ?? 0;
      const before = await monthTotals(tx, admin, "2026-10-01");
      const priced = { ...request, inputCentsPerMtok: 10, outputCentsPerMtok: 50, currency: "USD" };
      await logRequest(tx, { ...priced, status: "ok", inputTokens: 1000, outputTokens: 200 });
      await logRequest(tx, { ...priced, status: "ok", inputTokens: 3000, outputTokens: 0 });
      await logRequest(tx, { ...request, status: "ok", inputTokens: 500, outputTokens: 500 });
      const after = await monthTotals(tx, admin, "2026-10-01");
      const expected = (centTokens({ inputTokens: 1000, outputTokens: 200, inputCentsPerMtok: 10, outputCentsPerMtok: 50 }) ?? 0) + 30_000;
      t.check("drie verzoeken erbij, één zonder prijs, en de som in centtokens", [after.requests - before.requests, after.unpriced - before.unpriced, usd(after) - usd(before)], [3, 1, expected]);
      const lines = (await recentRequests(tx, admin, 50)).filter((line) => line.model === "check-model");
      t.ok("het verbruik toont de regels, zonder inhoud", lines.length === 3 && lines.every((line) => !("message" in line)));
    });

    t.section("6. Zonder het recht admin:ai geen verbruik");
    t.ok("monthTotals geweigerd", await refuses(() => monthTotals(db, nobody)));
    t.ok("recentRequests geweigerd", await refuses(() => recentRequests(db, nobody)));

    t.section("7. Wat naar het model gaat: de smokkeltest tegen de database");
    t.ok("de sleutel van het model staat niet in de omgeving van deze check", process.env[AI_KEY_ENV] === undefined);
    for (const prompt of AI_PROMPTS) {
      if (!AI_SMUGGLE_CASES.some((one) => one.prompt === prompt.key)) console.log(`  --    prompt ${prompt.key} heeft geen smokkelgeval in check-ai.project.ts; leest hij niets uit de database?`);
    }
    for (const one of AI_SMUGGLE_CASES) {
      const prompt = promptFor(one.prompt);
      t.ok(`geval ${one.prompt}: de prompt staat in de catalogus`, prompt !== undefined);
      if (prompt === undefined) continue;
      await inRollback(db, async (tx) => {
        const context = { organisationId: ctx.organisationId, userId: ctx.userId };
        const values = await one.values(tx, context);
        const forbidden = await one.forbidden(tx, context);
        t.ok(`geval ${one.prompt}: er is iets om te smokkelen`, forbidden.some((text) => text.trim().length >= 3));
        t.check(`geval ${one.prompt}: niets verbodens in het bericht naar het model`, smuggled(outgoingText(prompt, values), forbidden), []);
      });
    }

    t.summary("check:ai");
  });
});
