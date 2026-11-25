/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { TEAMS_WEBHOOK, TEAMS_WEBHOOK_TEST, teamsWebhook, withoutMarkdownLinks } from "./teams";

const REAL = "https://voorbeeld.invalid/echt-kanaal";
const TEST = "https://voorbeeld.invalid/testkanaal";

/** Productie is de sleutel, geen vlag voor testen (besluit M1). */
describe("welke Teams-webhook telt", () => {
  it("leest het echte kanaal alleen in productie", () => {
    expect(teamsWebhook({ APP_ENV: "production", [TEAMS_WEBHOOK]: REAL, [TEAMS_WEBHOOK_TEST]: TEST })).toEqual({ variable: TEAMS_WEBHOOK, url: REAL });
    expect(teamsWebhook({ VERCEL_ENV: "production", [TEAMS_WEBHOOK]: REAL })).toEqual({ variable: TEAMS_WEBHOOK, url: REAL });
  });

  it("stuurt buiten productie alleen naar het testkanaal, ook als het echte kanaal er staat", () => {
    for (const env of [{ APP_ENV: "local" }, { APP_ENV: "preview" }, { VERCEL_ENV: "preview" }, {}]) {
      expect(teamsWebhook({ ...env, [TEAMS_WEBHOOK]: REAL, [TEAMS_WEBHOOK_TEST]: TEST })).toEqual({ variable: TEAMS_WEBHOOK_TEST, url: TEST });
    }
  });

  it("stuurt buiten productie niets als er geen testkanaal is", () => {
    expect(teamsWebhook({ APP_ENV: "preview", [TEAMS_WEBHOOK]: REAL })).toEqual({ variable: TEAMS_WEBHOOK_TEST, url: "" });
    expect(teamsWebhook({ [TEAMS_WEBHOOK]: REAL, [TEAMS_WEBHOOK_TEST]: "  " })).toEqual({ variable: TEAMS_WEBHOOK_TEST, url: "" });
  });
});

describe("een koppeling in een kaart", () => {
  it("laat de url staan in plaats van hem achter de tekst te verstoppen", () => {
    expect(withoutMarkdownLinks("[klik](https://voorbeeld.invalid)")).toBe("[klik] (https://voorbeeld.invalid)");
  });
});
