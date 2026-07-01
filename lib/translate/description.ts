/**
 * Translates IGDB game descriptions (English) to Arabic via OpenAI.
 *
 * Called once at the IGDB boundary (lib/igdb/client.ts) so every cache
 * writer (search, popular, featured) persists Arabic descriptions without
 * needing to know about translation.
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-5-nano";

const SYSTEM_PROMPT = [
  "You translate video game descriptions from English to Arabic for a gaming app.",
  "Rules:",
  "- Keep game names in English (do not translate or transliterate them).",
  "- Keep company names (publishers/developers/studios) unchanged.",
  "- Do not add information that isn't in the source text.",
  "- Preserve the original tone.",
  "- Produce natural Arabic suitable for gamers, not a literal word-for-word translation.",
  "",
  "You receive a JSON array of strings. Respond with only a JSON object of the",
  'shape {"translations": string[]}, with translations in the exact same order',
  "and count as the input array.",
].join("\n");

/** Translates a batch of English descriptions to Arabic, preserving order. */
export async function translateDescriptionsToArabic(
  descriptions: string[],
): Promise<string[]> {
  if (descriptions.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(descriptions) },
      ],
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`OpenAI translation request failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI translation response had no content");
  }

  const parsed = JSON.parse(content) as { translations?: unknown };
  if (
    !Array.isArray(parsed.translations) ||
    parsed.translations.length !== descriptions.length ||
    !parsed.translations.every((t) => typeof t === "string")
  ) {
    throw new Error("OpenAI translation response shape mismatch");
  }

  return parsed.translations as string[];
}
