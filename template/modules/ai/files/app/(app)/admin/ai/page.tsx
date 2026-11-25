/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { notFound } from "next/navigation";
import { PageBody, Section, Stat, StatRow } from "@/components/page-body";
import { PageHeader } from "@/components/page-header";
import { Chip } from "@/components/ui/chip";
import { PopoverDisclosure } from "@/components/ui/popover-panel";
import { DataTable, EmptyRow, Td, Th, Thead, Tr } from "@/components/ui/table";
import { capState, CENT_TOKENS_PER_CENT, nextMonthStart } from "@/lib/ai/budget";
import { aiKey, AI_KEY_ENV } from "@/lib/ai/client";
import { centTokens, formatCost, priceInput } from "@/lib/ai/cost";
import { MODEL_SUGGESTIONS } from "@/lib/ai/models";
import { AI_PROMPTS, promptFor } from "@/lib/ai/prompts";
import { loadLimits, loadPrices, loadPromptSettings } from "@/lib/ai/settings";
import { monthTotals, recentRequests } from "@/lib/ai/usage";
import { can } from "@/lib/auth/can";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { formatDate, formatInstant, todayIso } from "@/lib/domain/dates";
import { labels } from "@/lib/i18n/labels";
import { PROJECT } from "@/lib/project/config.generated";
import { CapForm, PriceForm, PromptSettingForm, StopForm } from "./forms";

export const metadata = { title: labels.ai.title };

const PRICING_URL = "https://platform.claude.com/docs/en/about-claude/pricing";

/**
 * Beheer, AI: de grenzen van de organisatie (de noodstop en het maandplafond), de prompts met hun
 * instelling (Update opent een zwevend paneel), de prijzen per model, en het verbruik per verzoek met
 * wat het kostte. Niets hiervan staat in de code.
 */
export default async function AiPage() {
  const actor = await requireSession();
  if (!can(actor, "admin:ai")) notFound();

  const db = getDb();
  const [settings, prices, totals, requests, limits] = await Promise.all([
    loadPromptSettings(db, actor.organisationId),
    loadPrices(db, actor.organisationId),
    monthTotals(db, actor),
    recentRequests(db, actor),
    loadLimits(db, actor.organisationId),
  ]);
  const keyMissing = aiKey() === undefined;
  const models = [...new Set([...MODEL_SUGGESTIONS, ...settings.flatMap((setting) => (setting.model === null ? [] : [setting.model])), ...prices.map((price) => price.model)])];
  const monthCost = totals.costs.length === 0 ? labels.ai.costUnknown : totals.costs.map((cost) => formatCost(cost.centTokens, cost.currency, PROJECT.locale)).join(" + ");

  /* De grenzen: de stand van de maand in de valuta van het plafond, en welke modellen het plafond zou weigeren. */
  const stopped = limits.stoppedAt !== null;
  const cap = capState(totals.costs.find((cost) => cost.currency === limits.currency)?.centTokens ?? 0, limits.monthlyCapCents);
  const capText = limits.monthlyCapCents === null ? null : formatCost(limits.monthlyCapCents * CENT_TOKENS_PER_CENT, limits.currency, PROJECT.locale);
  const unpriced =
    limits.monthlyCapCents === null
      ? []
      : [...new Set(settings.flatMap((setting) => (setting.enabled && setting.model !== null && !prices.some((price) => price.model === setting.model && price.currency === limits.currency) ? [setting.model] : [])))];
  const notice = "border-warning/40 bg-warning/10 text-foreground mb-4 rounded-md border px-3 py-2 text-[12px]";

  return (
    <>
      <PageHeader eyebrow={labels.admin.eyebrow} title={labels.ai.title} />

      <PageBody>
        {limits.stoppedAt !== null && (
          <p role="status" className={notice}>
            {labels.ai.stoppedBanner(formatInstant(limits.stoppedAt), limits.stoppedByName ?? labels.ai.someone)}
          </p>
        )}
        {keyMissing && <p className={notice}>{labels.ai.noKey(AI_KEY_ENV)}</p>}
        {cap.level === "reached" && <p className={notice}>{labels.ai.capReachedBanner(formatDate(nextMonthStart(todayIso())))}</p>}
        {cap.level === "warning" && <p className={notice}>{labels.ai.capWarningBanner(cap.percent ?? 0)}</p>}
        {unpriced.length > 0 && <p className={notice}>{labels.ai.capUnpricedBanner(unpriced.join(", "))}</p>}

        <StatRow>
          <Stat label={labels.ai.statRequests} value={totals.requests} />
          <Stat
            label={labels.ai.statCost}
            value={monthCost}
            note={capText === null ? undefined : labels.ai.capNote(capText, cap.percent ?? 0)}
            tone={cap.level === "reached" ? "bad" : cap.level === "warning" ? "warn" : "neutral"}
          />
          <Stat label={labels.ai.statFailed} value={totals.failed} tone={totals.failed > 0 ? "warn" : "neutral"} />
        </StatRow>

        <Section title={labels.ai.limitsTitle} intro={labels.ai.limitsIntro}>
          <DataTable minWidth={620}>
            <Thead>
              <Th>{labels.ai.colLimitKind}</Th>
              <Th>{labels.ai.colLimitState}</Th>
              <Th />
            </Thead>
            <tbody>
              <Tr>
                <Td>{labels.ai.stopName}</Td>
                <Td>
                  <Chip tone={stopped ? "danger" : "success"}>{stopped ? labels.ai.stopOn : labels.ai.stopOff}</Chip>
                </Td>
                <Td>
                  <PopoverDisclosure label={stopped ? labels.ai.stopRelease : labels.ai.stopPress} title={labels.ai.stopName} width={420}>
                    <StopForm stopped={stopped} />
                  </PopoverDisclosure>
                </Td>
              </Tr>
              <Tr>
                <Td>{labels.ai.capName}</Td>
                <Td>{capText === null ? <span className="text-muted-foreground">{labels.ai.capNone}</span> : labels.ai.capLine(capText, cap.percent ?? 0)}</Td>
                <Td>
                  <PopoverDisclosure label={labels.ui.edit} srLabel={labels.ai.capName} title={labels.ai.capName} width={420}>
                    <CapForm cap={limits.monthlyCapCents === null ? "" : priceInput(limits.monthlyCapCents)} />
                  </PopoverDisclosure>
                </Td>
              </Tr>
            </tbody>
          </DataTable>
        </Section>

        <Section title={labels.ai.promptsTitle} intro={labels.ai.promptsIntro}>
          <DataTable minWidth={820}>
            <Thead>
              <Th>{labels.ai.colPrompt}</Th>
              <Th>{labels.ai.colEnabled}</Th>
              <Th>{labels.ai.colModel}</Th>
              <Th>{labels.ai.colEffort}</Th>
              <Th align="right">{labels.ai.colLimit}</Th>
              <Th />
            </Thead>
            <tbody>
              {AI_PROMPTS.length === 0 && <EmptyRow columns={6}>{labels.ai.promptsNone}</EmptyRow>}
              {settings.map((setting) => {
                const prompt = promptFor(setting.promptKey);
                if (prompt === undefined) return null;
                return (
                  <Tr key={setting.promptKey}>
                    <Td>
                      {prompt.title}
                      <span className="text-muted-foreground num ml-2 text-[11px]">
                        {prompt.key}, {labels.ai.version(prompt.version)}
                      </span>
                    </Td>
                    <Td>
                      <Chip tone={setting.enabled ? "success" : "neutral"}>{setting.enabled ? labels.ai.on : labels.ai.off}</Chip>
                    </Td>
                    <Td>{setting.model ?? <span className="text-muted-foreground">{labels.ai.noModel}</span>}</Td>
                    <Td>{labels.ai.effortNames[setting.effort] ?? setting.effort}</Td>
                    <Td align="right">{setting.dailyLimit}</Td>
                    <Td>
                      <PopoverDisclosure label={labels.ui.edit} srLabel={prompt.title} title={prompt.title} width={440}>
                        <PromptSettingForm promptKey={prompt.key} enabled={setting.enabled} model={setting.model ?? ""} effort={setting.effort} dailyLimit={setting.dailyLimit} models={models} />
                      </PopoverDisclosure>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </DataTable>
        </Section>

        <Section
          title={labels.ai.pricesTitle}
          intro={labels.ai.pricesIntro}
          actions={
            <PopoverDisclosure label={labels.ai.priceAdd} title={labels.ai.priceAdd} width={420} className="text-accent-quiet cursor-pointer text-[12px] font-medium">
              <PriceForm model="" input="" output="" models={models} />
            </PopoverDisclosure>
          }
        >
          <p className="mb-3 text-[12px]">
            <a href={PRICING_URL} target="_blank" rel="noopener noreferrer" className="text-accent-quiet underline underline-offset-2">
              {labels.ai.pricesLink}
            </a>
          </p>
          <DataTable minWidth={620}>
            <Thead>
              <Th>{labels.ai.colModel}</Th>
              <Th align="right">{labels.ai.colInput}</Th>
              <Th align="right">{labels.ai.colOutput}</Th>
              <Th />
            </Thead>
            <tbody>
              {prices.length === 0 && <EmptyRow columns={4}>{labels.ai.pricesNone}</EmptyRow>}
              {prices.map((price) => (
                <Tr key={price.model}>
                  <Td>{price.model}</Td>
                  <Td align="right">{formatCost(price.inputCentsPerMtok * 1_000_000, price.currency, PROJECT.locale)}</Td>
                  <Td align="right">{formatCost(price.outputCentsPerMtok * 1_000_000, price.currency, PROJECT.locale)}</Td>
                  <Td>
                    <PopoverDisclosure label={labels.ui.edit} srLabel={price.model} title={price.model} width={420}>
                      <PriceForm model={price.model} input={priceInput(price.inputCentsPerMtok)} output={priceInput(price.outputCentsPerMtok)} models={models} />
                    </PopoverDisclosure>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        </Section>

        <Section title={labels.ai.usageTitle} intro={labels.ai.usageIntro}>
          <DataTable minWidth={900}>
            <Thead>
              <Th>{labels.ai.colMoment}</Th>
              <Th>{labels.ai.colWho}</Th>
              <Th>{labels.ai.colPrompt}</Th>
              <Th>{labels.ai.colModel}</Th>
              <Th>{labels.ai.colStatus}</Th>
              <Th align="right">{labels.ai.colTokens}</Th>
              <Th align="right">{labels.ai.colCost}</Th>
              <Th align="right">{labels.ai.colDuration}</Th>
            </Thead>
            <tbody>
              {requests.length === 0 && <EmptyRow columns={8}>{labels.ai.usageNone}</EmptyRow>}
              {requests.map((row) => {
                const cost = centTokens(row);
                return (
                  <Tr key={row.id}>
                    <Td>
                      <span className="num text-foreground-soft">{formatInstant(row.createdAt)}</span>
                    </Td>
                    <Td>{row.userName ?? labels.ai.someone}</Td>
                    <Td>
                      {promptFor(row.promptKey)?.title ?? row.promptKey}
                      <span className="text-muted-foreground num ml-2 text-[11px]">{labels.ai.version(row.promptVersion)}</span>
                    </Td>
                    <Td>{row.model}</Td>
                    <Td>
                      <span className={row.status === "ok" ? undefined : "text-destructive"} title={row.error ?? undefined}>
                        {labels.ai.statusNames[row.status] ?? row.status}
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="num">
                        {row.inputTokens} / {row.outputTokens}
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="num">{cost === null || row.currency === null ? labels.ai.costUnknown : formatCost(cost, row.currency, PROJECT.locale)}</span>
                    </Td>
                    <Td align="right">
                      <span className="num">{labels.ai.seconds(row.durationMs)}</span>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </DataTable>
        </Section>
      </PageBody>
    </>
  );
}
