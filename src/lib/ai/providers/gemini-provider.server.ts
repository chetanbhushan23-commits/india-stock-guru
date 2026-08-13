/**
 * GeminiProvider (server-only) — direct Google Gemini API.
 *
 * Gemini is the primary reasoning + research provider. Google Search grounding
 * is enabled for fresh web research. The application still treats the
 * normalized ResearchContext as the authoritative evidence layer.
 *
 * IMPORTANT: Gemini model names change over time. Never let one stale model
 * name take the whole Q&A service down. We try the configured model first,
 * then the current stable production model, then the low-cost stable model.
 */

import type { AIProvider, AIProviderRequest, AIProviderResponse } from "../ai-types";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.5-flash";
const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

function apiKey(): string | undefined {
  return process.env["GEMINI_API_KEY"]?.trim() || undefined;
}

function configuredModel(): string {
  return process.env["GEMINI_MODEL"]?.trim() || process.env["AI_GEMINI_MODEL"]?.trim() || DEFAULT_MODEL;
}

function modelCandidates(): string[] {
  return [...new Set([configuredModel(), ...FALLBACK_MODELS])].filter(Boolean);
}

function modelSchema(schema: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(schema)) return schema as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "additionalProperties" || key === "name") continue;
    if (key === "properties" && value && typeof value === "object") {
      out[key] = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, modelSchema(v as Record<string, unknown>)]),
      );
    } else if (key === "items" && value && typeof value === "object") {
      out[key] = modelSchema(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function errorForStatus(status: number, detail: string): Error {
  if (status === 429) return new Error("Gemini rate limit reached. Try again shortly.");
  if (status === 400) return new Error(`Gemini request rejected: ${detail.slice(0, 300)}`);
  if (status === 401 || status === 403) return new Error("Gemini API key is invalid or not authorized.");
  if (status === 404) return new Error(`Gemini model not found: ${detail.slice(0, 220)}`);
  return new Error(`Gemini API error ${status}: ${detail.slice(0, 300)}`);
}

async function complete(request: AIProviderRequest): Promise<AIProviderResponse> {
  const key = apiKey();
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");

  const failures: string[] = [];

  for (const model of modelCandidates()) {
    const response = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: "user", parts: [{ text: request.user }] }],
        // Gemini 3.x supports structured outputs together with Google Search.
        tools: [{ google_search: {} }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: modelSchema(request.schema),
          thinkingConfig: { thinkingLevel: "medium" },
        },
      }),
    });

    if (response.ok) {
      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const raw = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
      if (!raw.trim()) throw new Error(`Gemini ${model} returned an empty response.`);
      return { raw, model };
    }

    const detail = await response.text().catch(() => "");
    const error = errorForStatus(response.status, detail);

    // A retired/invalid model must never break the whole AI Q&A service.
    // Continue to the next known-good model only for 404 model errors.
    if (response.status === 404) {
      failures.push(`${model}: ${error.message}`);
      continue;
    }

    throw error;
  }

  throw new Error(
    `No supported Gemini model is available. Tried ${modelCandidates().join(", ")}. ${failures.join(" | ")}`,
  );
}

export const geminiProvider: AIProvider = {
  id: "gemini",
  name: "Gemini (Google API + Search Grounding)",
  isConfigured: () => Boolean(apiKey()),
  complete,
};
