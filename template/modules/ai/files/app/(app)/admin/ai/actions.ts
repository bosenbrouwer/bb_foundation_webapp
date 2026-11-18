/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/ui/form-state";
import { saveMonthlyCap, savePrice, savePromptSetting, setEmergencyStop } from "@/lib/ai/settings";
import { assertCan } from "@/lib/auth/can";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { oneOf } from "@/lib/domain/one-of";
import { labels } from "@/lib/i18n/labels";

export async function savePromptSettingAction(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "admin:ai");
  const result = await savePromptSetting(
    getDb(),
    actor,
    {
      promptKey: String(form.get("promptKey") ?? ""),
      enabled: form.get("enabled") === "on",
      model: String(form.get("model") ?? ""),
      effort: String(form.get("effort") ?? ""),
      dailyLimit: String(form.get("dailyLimit") ?? ""),
    },
    labels.ai.settingErrors,
  );
  if (!result.ok) return { errors: result.errors };
  revalidatePath("/admin/ai");
  return { errors: {}, done: labels.ai.settingSaved };
}

export async function savePriceAction(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "admin:ai");
  const result = await savePrice(
    getDb(),
    actor,
    { model: String(form.get("model") ?? ""), input: String(form.get("input") ?? ""), output: String(form.get("output") ?? "") },
    labels.ai.priceErrors,
  );
  if (!result.ok) return { errors: result.errors };
  revalidatePath("/admin/ai");
  return { errors: {}, done: labels.ai.priceSaved };
}

export async function saveMonthlyCapAction(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "admin:ai");
  const result = await saveMonthlyCap(getDb(), actor, { cap: String(form.get("cap") ?? "") }, labels.ai.capErrors);
  if (!result.ok) return { errors: result.errors };
  revalidatePath("/admin/ai");
  return { errors: {}, done: labels.ai.capSaved };
}

export async function setEmergencyStopAction(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "admin:ai");
  /* Een keuze van buiten: alleen deze twee waarden bestaan. */
  const choice = oneOf(form.get("stop"), ["on", "off"] as const);
  if (choice === undefined) return { errors: { stop: labels.ai.stopBadChoice } };
  await setEmergencyStop(getDb(), actor, choice === "on");
  revalidatePath("/admin/ai");
  return { errors: {}, done: choice === "on" ? labels.ai.stopDone : labels.ai.stopReleased };
}
