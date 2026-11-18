/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { expect, test } from "@playwright/test";
import { labels } from "../lib/i18n/labels";
import { signIn } from "./helpers";

/**
 * Het tabblad Achtergrondwerk staat onder Beheer voor wie het systeem mag zien, en de cronroute van
 * de wachtrij is dicht zonder het geheim en antwoordt met een telling als het klopt.
 */
test("een beheerder ziet de wachtrij en de twee knoppen", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/jobs");
  await expect(page.getByRole("heading", { name: labels.jobs.title, level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: labels.jobs.flush })).toBeVisible();
  await expect(page.getByRole("button", { name: labels.jobs.retry })).toBeVisible();

  await page.getByRole("button", { name: labels.jobs.flush }).click();
  await expect(page.getByRole("status")).toBeVisible();
});

test("de cronroute van de wachtrij is dicht zonder het geheim en telt met het geheim", async ({ request }) => {
  const without = await request.get("/api/cron/jobs");
  expect(without.status()).toBe(404);

  const right = await request.get("/api/cron/jobs", { headers: { authorization: "Bearer e2e-cron-secret" } });
  expect(right.status()).toBe(200);
  /* Twee stappen met elk hun uitkomst, en geen van beide mislukt (lib/cron/steps.ts). */
  const body = (await right.json()) as { results: { process: { claimed: number } | null; prune: number | null }; failed: string[] };
  expect(typeof body.results.process?.claimed).toBe("number");
  expect(typeof body.results.prune).toBe("number");
  expect(body.failed).toEqual([]);
});
