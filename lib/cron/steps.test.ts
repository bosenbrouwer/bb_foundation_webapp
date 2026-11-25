/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reported: { message: string; route: string | undefined; kind: string | undefined }[] = [];

vi.mock("@/lib/monitoring/report", () => ({
  reportError: async (error: unknown, context: { route?: string; kind?: string } = {}) => {
    reported.push({ message: error instanceof Error ? error.message : String(error), route: context.route, kind: context.kind });
  },
}));

import { runSteps, stepsResponse } from "./steps";

/** Een fout in één stap stopt de rest niet, en hij wordt gemeld met de naam van de stap erbij. */
describe("runSteps", () => {
  beforeEach(() => {
    reported.length = 0;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("geeft de uitkomst van elke stap terug, in volgorde", async () => {
    const order: string[] = [];
    const run = await runSteps("GET /api/cron/test", {
      first: async () => {
        order.push("first");
        return { checked: 3 };
      },
      second: async () => {
        order.push("second");
        return 7;
      },
    });

    expect(order).toEqual(["first", "second"]);
    expect(run.results.first).toEqual({ checked: 3 });
    expect(run.results.second).toBe(7);
    expect(run.failed).toEqual([]);
    expect(reported).toEqual([]);
  });

  it("laat de stappen na een mislukte stap gewoon lopen", async () => {
    const order: string[] = [];
    const run = await runSteps("GET /api/cron/nightly", {
      first: async () => {
        order.push("first");
        return 1;
      },
      second: async (): Promise<number> => {
        order.push("second");
        throw new Error("Failed query: update reminders");
      },
      third: async () => {
        order.push("third");
        return 2;
      },
      fourth: async () => {
        order.push("fourth");
        return 3;
      },
    });

    expect(order).toEqual(["first", "second", "third", "fourth"]);
    expect(run.results).toEqual({ first: 1, second: null, third: 2, fourth: 3 });
    expect(run.failed).toEqual(["second"]);
  });

  it("meldt elke mislukte stap, met zijn naam erbij", async () => {
    const run = await runSteps("GET /api/cron/prune", {
      outbox: async (): Promise<number> => {
        throw new Error("eerste");
      },
      limits: async () => 4,
      retention: async (): Promise<number> => {
        throw "tweede, geen Error";
      },
    });

    expect(run.failed).toEqual(["outbox", "retention"]);
    expect(run.results.limits).toBe(4);
    expect(reported).toEqual([
      { message: "eerste", route: "GET /api/cron/prune (outbox)", kind: "cron" },
      { message: "tweede, geen Error", route: "GET /api/cron/prune (retention)", kind: "cron" },
    ]);
  });

  it("zonder stappen is er niets mislukt", async () => {
    expect(await runSteps("GET /api/cron/leeg", {})).toEqual({ results: {}, failed: [] });
  });
});

describe("stepsResponse", () => {
  it("antwoordt 200 als alles liep en 500 als er een stap mislukte, met de namen erbij", async () => {
    const fine = stepsResponse({ results: { limits: 4 }, failed: [] });
    expect(fine.status).toBe(200);
    expect(await fine.json()).toEqual({ results: { limits: 4 }, failed: [] });

    const broken = stepsResponse({ results: { limits: 4, outbox: null }, failed: ["outbox"] });
    expect(broken.status).toBe(500);
    expect(await broken.json()).toEqual({ results: { limits: 4, outbox: null }, failed: ["outbox"] });
  });
});
