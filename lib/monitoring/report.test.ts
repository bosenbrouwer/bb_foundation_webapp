/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_REPORT_LENGTH, causeTags, describeError, reportError, scrubMessage } from "./report";

/** De fout zoals Drizzle hem gooit bij een check: de query bovenop, de reden van Postgres eronder. */
function checkViolation(): Error {
  const cause = Object.assign(new Error('new row for relation "orders" violates check constraint "orders_amount_not_negative"'), {
    code: "23514",
    constraint: "orders_amount_not_negative",
    table: "orders",
    schema: "public",
    detail: "Failing row contains (8c27df3e, Geheime opdracht van de klant, -5).",
  });
  return new Error('Failed query: update "orders" set "name" = $1, "amount_cents" = $2 where "orders"."id" = $3\nparams: Geheime opdracht van de klant,-5,8c27df3e', { cause });
}

/** De oorzaak als labels (besluit D16). Namen uit het eigen schema mogen mee, inhoud nooit. */
describe("causeTags", () => {
  it("geeft de code, de check en de tabel van de fout onder Drizzle", () => {
    expect(causeTags(checkViolation())).toEqual({ cause_code: "23514", cause_constraint: "orders_amount_not_negative", cause_table: "orders" });
  });

  it("neemt de melding en het detail van de database nooit mee", () => {
    const tags = JSON.stringify(causeTags(checkViolation()));
    expect(tags).not.toContain("Geheime opdracht");
    expect(tags).not.toContain("Failing row");
    expect(tags).not.toContain("8c27df3e");
  });

  it("neemt de kolom mee als de database hem noemt", () => {
    const error = new Error("Failed query", { cause: { code: "23502", table: "orders", column: "customer_id" } });
    expect(causeTags(error)).toEqual({ cause_code: "23502", cause_table: "orders", cause_column: "customer_id" });
  });

  it("kent ook de code van een verbinding die wegviel", () => {
    const error = new TypeError("fetch failed", { cause: { code: "ECONNRESET", hostname: "ergens.example" } });
    expect(causeTags(error)).toEqual({ cause_code: "ECONNRESET" });
  });

  it("laat weg wat er niet uitziet als een code of een naam", () => {
    const error = new Error("Failed query", {
      cause: { code: "23505", constraint: "Key (email)=(iemand@voorbeeld.nl)", table: "users; drop table", column: "Naam Met Spaties" },
    });
    expect(causeTags(error)).toEqual({ cause_code: "23505" });
  });

  it("slaat een code over die geen code is en kijkt een laag dieper", () => {
    const error = Object.assign(new Error("buitenste"), { code: "iemand anders", cause: { code: "57014" } });
    expect(causeTags(error)).toEqual({ cause_code: "57014" });
  });

  it("geeft niets bij een fout zonder oorzaak, en bij iets wat geen fout is", () => {
    expect(causeTags(new Error("gewoon stuk"))).toEqual({});
    expect(causeTags("tekst")).toEqual({});
    expect(causeTags(null)).toEqual({});
  });

  it("stopt bij een keten die in een kring loopt", () => {
    const circle: { cause?: unknown } = {};
    circle.cause = circle;
    expect(causeTags(circle)).toEqual({});
  });

  it("staat als labels achter de regel in de log, zonder de rij", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await reportError(checkViolation(), { kind: "action", method: "POST", route: "/app/orders" });
    const lines = spy.mock.calls.map((call) => String(call[0]));
    spy.mockRestore();
    expect(lines[0]).toContain("[cause_code=23514 cause_constraint=orders_amount_not_negative cause_table=orders]");
    expect(lines.join("\n")).not.toContain("Geheime opdracht");
    expect(lines.join("\n")).not.toContain("Failing row");
  });
});

describe("scrubMessage", () => {
  it("laat de parameters van een Drizzle-melding weg", () => {
    const text = 'Failed query: insert into "users" ("email") values ($1)\nparams: iemand@voorbeeld.nl,geheim';
    const result = scrubMessage(text);
    expect(result).toContain("params: [weggelaten]");
    expect(result).not.toContain("geheim");
    expect(result).not.toContain("voorbeeld.nl");
  });

  it("maskeert de sleutelwaarde in een Postgres-detail en elk mailadres", () => {
    expect(scrubMessage("Key (email)=(iemand@voorbeeld.nl) already exists.")).toBe("Key (email)=(...) already exists.");
    expect(scrubMessage("Login voor iemand.anders+tag@sub.voorbeeld.org mislukt")).toBe("Login voor [e-mail] mislukt");
  });

  it("maskeert verbindingsstrings, bearer-tokens, JWT's en handtekeningen in een URL", () => {
    /* Geen geheim: een verzonnen verbindingsstring, precies wat deze test hoort weg te poetsen. */
    // secretlint-disable-next-line
    expect(scrubMessage("connect postgresql://app:wachtwoord@ep-x.eu-central-1.aws.neon.tech/db?sslmode=require failed")).toBe("connect [verbindingsstring] failed");
    expect(scrubMessage("header Authorization: Bearer abc.def-ghi_jkl")).toBe("header Authorization: Bearer [token]");
    expect(scrubMessage("token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.sig_part-here")).toBe("token [token]");
    expect(scrubMessage("GET https://x.blob.core.windows.net/c/f.png?sv=2024&sig=abc%2Bdef&se=2027")).toBe("GET https://x.blob.core.windows.net/c/f.png?sv=[weggelaten]&sig=[weggelaten]&se=[weggelaten]");
  });

  it("kapt af op de maximale lengte en zegt dat", () => {
    const result = scrubMessage("x".repeat(MAX_REPORT_LENGTH + 50));
    expect(result.length).toBe(MAX_REPORT_LENGTH + " [afgekapt]".length);
    expect(result.endsWith("[afgekapt]")).toBe(true);
  });

  it("laat een gewone melding met rust", () => {
    expect(scrubMessage("Geen organisatie gevonden. Draai pnpm db:bootstrap.")).toBe("Geen organisatie gevonden. Draai pnpm db:bootstrap.");
  });
});

describe("describeError", () => {
  it("neemt naam, digest en een schoongemaakte stack mee", () => {
    const error = Object.assign(new Error("Key (email)=(a@b.nl) already exists."), { digest: "1234567890" });
    const report = describeError(error);
    expect(report.name).toBe("Error");
    expect(report.digest).toBe("1234567890");
    expect(report.message).toBe("Key (email)=(...) already exists.");
    expect(report.stack).not.toContain("a@b.nl");
  });

  it("kan ook een gegooide string of een onbeschrijfbaar object aan", () => {
    expect(describeError("iets@voorbeeld.nl ging mis")).toEqual({ name: "string", message: "[e-mail] ging mis", stack: undefined, digest: undefined });
    const hostile = {
      toString() {
        throw new Error("nee");
      },
    };
    expect(describeError(hostile).message).toBe("[niet te beschrijven]");
  });
});

describe("reportError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("schrijft één schoongemaakte regel naar de console en gooit nooit", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(reportError(new Error("mail naar iemand@voorbeeld.nl mislukt"), { kind: "action", method: "POST", route: "/app/admin" })).resolves.toBeUndefined();
    const first = spy.mock.calls[0]?.[0];
    expect(first).toBe("[report] action POST /app/admin: Error: mail naar [e-mail] mislukt");
  });

  it("overleeft een console die zelf gooit", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("console kapot");
    });
    await expect(reportError(new Error("x"))).resolves.toBeUndefined();
  });
});
