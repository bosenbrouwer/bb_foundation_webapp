/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Wat een beheerder instelt onder Beheer, AI: per prompt aan of uit, het model, het denkniveau en de
 * daglimiet per persoon, per model de prijzen, en voor de hele organisatie het maandplafond en de
 * noodstop. Niets hiervan staat in de code. Geen rij betekent: de prompt staat uit, er is geen
 * plafond en geen noodstop. Schrijven kan alleen met het recht `admin:ai` en laat een auditregel
 * achter.
 */
import { and, eq, sql } from "drizzle-orm";
import type { Actor } from "@/lib/auth/actor";
import { assertCan } from "@/lib/auth/can";
import { appendAuditLog } from "@/lib/db/audit";
import type { DbOrTransaction } from "@/lib/db/client";
import { aiLimits, aiModelPrices, aiPromptSettings, users, type AiEffort } from "@/lib/db/schema";
import { parseCap } from "./budget";
import { DEFAULT_CURRENCY, parsePrice } from "./cost";
import { EFFORTS, isModelId } from "./models";
import { AI_PROMPTS, promptFor } from "./prompts";

export const DEFAULT_DAILY_LIMIT = 20;

export interface PromptSetting {
  readonly promptKey: string;
  readonly enabled: boolean;
  readonly model: string | null;
  readonly effort: AiEffort;
  readonly dailyLimit: number;
  /** Nog nooit door een beheerder aangeraakt. */
  readonly isDefault: boolean;
}

export interface StoredPromptSetting {
  readonly promptKey: string;
  readonly enabled: boolean;
  readonly model: string | null;
  readonly effort: AiEffort;
  readonly dailyLimit: number;
}

/** Puur: de rijen uit de database over de catalogus heen gelegd. Een prompt zonder rij staat uit. */
export function mergePromptSettings(rows: readonly StoredPromptSetting[]): readonly PromptSetting[] {
  return AI_PROMPTS.map((prompt) => {
    const stored = rows.find((row) => row.promptKey === prompt.key);
    return stored === undefined
      ? { promptKey: prompt.key, enabled: false, model: null, effort: prompt.defaultEffort, dailyLimit: DEFAULT_DAILY_LIMIT, isDefault: true }
      : { ...stored, isDefault: false };
  });
}

const settingColumns = { promptKey: aiPromptSettings.promptKey, enabled: aiPromptSettings.enabled, model: aiPromptSettings.model, effort: aiPromptSettings.effort, dailyLimit: aiPromptSettings.dailyLimit };

export async function loadPromptSettings(db: DbOrTransaction, organisationId: string): Promise<readonly PromptSetting[]> {
  const rows = await db.select(settingColumns).from(aiPromptSettings).where(eq(aiPromptSettings.organisationId, organisationId));
  return mergePromptSettings(rows);
}

export async function loadPromptSetting(db: DbOrTransaction, organisationId: string, promptKey: string): Promise<PromptSetting | undefined> {
  return (await loadPromptSettings(db, organisationId)).find((setting) => setting.promptKey === promptKey);
}

export interface PromptSettingInput {
  readonly promptKey: string;
  readonly enabled: boolean;
  readonly model: string;
  readonly effort: string;
  readonly dailyLimit: string;
}

export interface PromptSettingTexts {
  readonly unknownPrompt: string;
  readonly badModel: string;
  readonly modelRequired: string;
  readonly badEffort: string;
  readonly badLimit: string;
}

export type SaveResult = { readonly ok: true } | { readonly ok: false; readonly errors: Readonly<Record<string, string>> };

const isEffort = (value: string): value is AiEffort => (EFFORTS as readonly string[]).includes(value);

export async function savePromptSetting(db: DbOrTransaction, actor: Actor, input: PromptSettingInput, texts: PromptSettingTexts): Promise<SaveResult> {
  assertCan(actor, "admin:ai");
  if (promptFor(input.promptKey) === undefined) return { ok: false, errors: { promptKey: texts.unknownPrompt } };
  const model = input.model.trim();
  if (model !== "" && !isModelId(model)) return { ok: false, errors: { model: texts.badModel } };
  if (input.enabled && model === "") return { ok: false, errors: { model: texts.modelRequired } };
  if (!isEffort(input.effort)) return { ok: false, errors: { effort: texts.badEffort } };
  const limitText = input.dailyLimit.trim();
  if (!/^\d{1,5}$/.test(limitText) || Number(limitText) > 10_000) return { ok: false, errors: { dailyLimit: texts.badLimit } };

  const where = and(eq(aiPromptSettings.organisationId, actor.organisationId), eq(aiPromptSettings.promptKey, input.promptKey));
  const before = (await db.select(settingColumns).from(aiPromptSettings).where(where).limit(1))[0];
  const after = { promptKey: input.promptKey, enabled: input.enabled, model: model === "" ? null : model, effort: input.effort, dailyLimit: Number(limitText) };

  await db
    .insert(aiPromptSettings)
    .values({ organisationId: actor.organisationId, ...after })
    .onConflictDoUpdate({ target: [aiPromptSettings.organisationId, aiPromptSettings.promptKey], set: { ...after, updatedAt: sql`now()` } });
  await appendAuditLog(db, actor, {
    entityTable: "ai_prompt_settings",
    entityId: actor.organisationId,
    action: before === undefined ? "insert" : "update",
    ...(before === undefined ? {} : { before }),
    after,
  });
  return { ok: true };
}

export interface ModelPrice {
  readonly model: string;
  readonly inputCentsPerMtok: number;
  readonly outputCentsPerMtok: number;
  readonly currency: string;
}

const priceColumns = { model: aiModelPrices.model, inputCentsPerMtok: aiModelPrices.inputCentsPerMtok, outputCentsPerMtok: aiModelPrices.outputCentsPerMtok, currency: aiModelPrices.currency };

export async function loadPrices(db: DbOrTransaction, organisationId: string): Promise<readonly ModelPrice[]> {
  return db.select(priceColumns).from(aiModelPrices).where(eq(aiModelPrices.organisationId, organisationId)).orderBy(aiModelPrices.model);
}

export async function priceFor(db: DbOrTransaction, organisationId: string, model: string): Promise<ModelPrice | undefined> {
  return (await db.select(priceColumns).from(aiModelPrices).where(and(eq(aiModelPrices.organisationId, organisationId), eq(aiModelPrices.model, model))).limit(1))[0];
}

export interface PriceInput {
  readonly model: string;
  readonly input: string;
  readonly output: string;
}

export interface PriceTexts {
  readonly badModel: string;
  readonly badPrice: string;
}

export async function savePrice(db: DbOrTransaction, actor: Actor, input: PriceInput, texts: PriceTexts): Promise<SaveResult> {
  assertCan(actor, "admin:ai");
  const model = input.model.trim();
  if (!isModelId(model)) return { ok: false, errors: { model: texts.badModel } };
  const inputPrice = parsePrice(input.input);
  if (!inputPrice.ok) return { ok: false, errors: { input: texts.badPrice } };
  const outputPrice = parsePrice(input.output);
  if (!outputPrice.ok) return { ok: false, errors: { output: texts.badPrice } };

  const before = await priceFor(db, actor.organisationId, model);
  const after = { model, inputCentsPerMtok: inputPrice.cents, outputCentsPerMtok: outputPrice.cents, currency: DEFAULT_CURRENCY };
  await db
    .insert(aiModelPrices)
    .values({ organisationId: actor.organisationId, ...after })
    .onConflictDoUpdate({ target: [aiModelPrices.organisationId, aiModelPrices.model], set: { ...after, updatedAt: sql`now()` } });
  await appendAuditLog(db, actor, {
    entityTable: "ai_model_prices",
    entityId: actor.organisationId,
    action: before === undefined ? "insert" : "update",
    ...(before === undefined ? {} : { before }),
    after,
  });
  return { ok: true };
}

export interface Limits {
  /** Het plafond per kalendermaand in centen; null is geen plafond. */
  readonly monthlyCapCents: number | null;
  readonly currency: string;
  /** De noodstop: een tijdstip betekent dat geen enkele prompt wordt uitgevoerd. */
  readonly stoppedAt: Date | null;
  readonly stoppedByName: string | null;
}

/** Zonder rij: geen plafond en geen noodstop. */
export const NO_LIMITS: Limits = { monthlyCapCents: null, currency: DEFAULT_CURRENCY, stoppedAt: null, stoppedByName: null };

/** De grenzen van de organisatie. Zonder recht: `runPrompt` leest ze bij elke aanroep. */
export async function loadLimits(db: DbOrTransaction, organisationId: string): Promise<Limits> {
  const row = (
    await db
      .select({ monthlyCapCents: aiLimits.monthlyCapCents, currency: aiLimits.currency, stoppedAt: aiLimits.stoppedAt, stoppedByName: users.displayName })
      .from(aiLimits)
      .leftJoin(users, eq(users.id, aiLimits.stoppedBy))
      .where(eq(aiLimits.organisationId, organisationId))
      .limit(1)
  )[0];
  return row ?? NO_LIMITS;
}

export interface CapInput {
  readonly cap: string;
}

export interface CapTexts {
  readonly badCap: string;
  readonly zeroCap: string;
}

/** Het maandplafond zetten, wijzigen of (met een leeg veld) weghalen. Altijd in de valuta van de prijzen. */
export async function saveMonthlyCap(db: DbOrTransaction, actor: Actor, input: CapInput, texts: CapTexts): Promise<SaveResult> {
  assertCan(actor, "admin:ai");
  const parsed = parseCap(input.cap);
  if (!parsed.ok) return { ok: false, errors: { cap: parsed.reason === "zero" ? texts.zeroCap : texts.badCap } };

  const before = await loadLimits(db, actor.organisationId);
  const after = { monthlyCapCents: parsed.cents, currency: DEFAULT_CURRENCY };
  await db
    .insert(aiLimits)
    .values({ organisationId: actor.organisationId, ...after })
    .onConflictDoUpdate({ target: aiLimits.organisationId, set: { ...after, updatedAt: sql`now()` } });
  await appendAuditLog(db, actor, {
    entityTable: "ai_limits",
    entityId: actor.organisationId,
    action: "update",
    before: { monthlyCapCents: before.monthlyCapCents, currency: before.currency },
    after,
  });
  return { ok: true };
}

/**
 * De noodstop zetten of eraf halen. Zetten wat al zo staat, doet niets en laat geen auditregel
 * achter: het tijdstip en de naam blijven die van wie hem het eerst zette.
 */
export async function setEmergencyStop(db: DbOrTransaction, actor: Actor, stop: boolean): Promise<void> {
  assertCan(actor, "admin:ai");
  const before = await loadLimits(db, actor.organisationId);
  if ((before.stoppedAt !== null) === stop) return;

  const state = stop ? { stoppedAt: sql`now()`, stoppedBy: actor.id } : { stoppedAt: null, stoppedBy: null };
  await db
    .insert(aiLimits)
    .values({ organisationId: actor.organisationId, ...state })
    .onConflictDoUpdate({ target: aiLimits.organisationId, set: { ...state, updatedAt: sql`now()` } });
  await appendAuditLog(db, actor, {
    entityTable: "ai_limits",
    entityId: actor.organisationId,
    action: "update",
    before: { stopped: !stop },
    after: { stopped: stop },
  });
}
