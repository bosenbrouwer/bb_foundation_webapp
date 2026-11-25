/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Een bericht naar een Teams-kanaal via een inkomende webhook (Workflows). Alleen als
 * `messaging.teams` in project.config.json aan staat én de webhook er is; anders blijven
 * Teams-berichten in de outbox staan met de melding wat er ontbreekt.
 *
 * **Productie is de sleutel, geen vlag voor testen** (besluit M1 in docs/modules/messaging.md). Het
 * echte kanaal (`TEAMS_WEBHOOK_URL`) wordt alleen in productie gelezen. Overal elders (lokaal, een
 * preview, een onbekende omgeving) gaat een bericht alleen naar een uitdrukkelijk testkanaal
 * (`TEAMS_WEBHOOK_URL_TEST`); ontbreekt dat, dan gaat er niets uit. Een vlag "dit is een test" kun je
 * vergeten te zetten, en dan staat een proefbericht van een preview in het kanaal van de collega's;
 * een variabele die alleen in productie telt, kun je niet vergeten.
 */
import { deployEnvironment } from "@/lib/domain/deploy-environment";
import { fetchWithTimeout } from "@/lib/integrations/http";
import { PROJECT } from "@/lib/project/config.generated";

export const TEAMS_WEBHOOK = "TEAMS_WEBHOOK_URL";
export const TEAMS_WEBHOOK_TEST = "TEAMS_WEBHOOK_URL_TEST";

/** De webhook die in deze omgeving telt: het echte kanaal in productie, anders alleen het testkanaal. */
export function teamsWebhook(env: Readonly<Record<string, string | undefined>> = process.env): { readonly variable: string; readonly url: string } {
  const variable = deployEnvironment(env) === "production" ? TEAMS_WEBHOOK : TEAMS_WEBHOOK_TEST;
  return { variable, url: (env[variable] ?? "").trim() };
}

export function teamsConfigured(): boolean {
  return PROJECT.messaging.teams && teamsWebhook().url !== "";
}

export function teamsMissing(): string[] {
  if (!PROJECT.messaging.teams) return [];
  return teamsConfigured() ? [] : [teamsWebhook().variable];
}

export async function sendTeams(message: { readonly subject: string; readonly bodyMd: string }): Promise<void> {
  const { variable, url } = teamsWebhook();
  if (url === "") throw new Error(`${variable} ontbreekt, dus er kan niets naar Teams.`);

  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(card(message)),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Teams gaf status ${response.status}. ${detail.slice(0, 200)}`);
  }
}

function card(message: { readonly subject: string; readonly bodyMd: string }): unknown {
  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            { type: "TextBlock", text: withoutMarkdownLinks(message.subject), weight: "Bolder", wrap: true },
            { type: "TextBlock", text: withoutMarkdownLinks(message.bodyMd), wrap: true },
          ],
        },
      },
    ],
  };
}

/** Een adaptive card maakt van `[tekst](url)` een koppeling met de tekst als label; een spatie ertussen laat de url staan. */
export function withoutMarkdownLinks(text: string): string {
  return text.replace(/\]\s*\(/g, "] (");
}
