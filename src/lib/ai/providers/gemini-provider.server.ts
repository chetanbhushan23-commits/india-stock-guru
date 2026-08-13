/**
 * GeminiProvider (server-only) — direct Google Gemini API.
 *
 * Gemini is used for AI reasoning and Google Search grounding is enabled so
 * research questions can use fresh web information. The application still
 * treats the normalized ResearchContext as the authoritative evidence layer.
 */

import type { AIProvider, AIProviderRequest, AIProviderResponse } from "../ai-types";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";

function apiKey(): string | undefined {
  return process.env["GEMINI_API_KEY"];
}

function modelSchema(schema: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(schema)) return schema as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "additionalProperties" || key === "name") continue;
    if (key === "properties" && value && typeof value === "object") {
      out[key] = Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, modelSchema(v as Record<string, unknown>)]));
    } else if (key === "items" && value && typeof value === "object") {
      out[key] = modelSchema(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function complete(request: AIProviderRequest): Promise<AIProviderResponse> {
  const key = apiKey();
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");

  const model = process.env["GEMINI_MODEL"] ?? process.env["AI_GEMINI_MODEL"] ?? DEFAULT_MODEL;
  const response = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: "user", parts: [{ text: request.user }] }],
      tools: [{ google_search: {} }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: modelSchema(request.schema),
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 429) throw new Error("Gemini rate limit reached. Try again shortly.");
    if (response.status === 400) throw new Error(`Gemini request rejected: ${detail.slice(0, 300)}`);
    if (response.status === 401 || response.status === 403) throw new Error("Gemini API key is invalid or not authorized.");
    throw new Error(`Gemini API error ${response.status}: ${detail.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const raw = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!raw.trim()) throw new Error("Gemini returned an empty response.");
  return { raw, model };
}

export const geminiProvider: AIProvider = {
  id: "gemini",
  name: "Gemini (Google API + Search Grounding)",
  isConfigured: () => Boolean(apiKey()),
  complete,
};
