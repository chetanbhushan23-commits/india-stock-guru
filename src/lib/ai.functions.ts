/**
 * AI transport boundary.
 *
 * The Q&A workspace uses the explicit same-origin HTTP route `/api/ai/ask`.
 * This avoids fragile generated server-function RPC fetches in Vite/Nitro
 * preview and deployed Worker environments while keeping all reasoning and
 * provider code server-side.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { routeQuestion } from "./ai/ai-question-router";
import type { AIReasoningResult, AIRoutePlan, IntentClassification } from "./ai/ai-types";

const askInput = z.object({
  question: z.string().trim().min(2).max(600),
  symbols: z.array(z.string().trim().min(1).max(24)).max(4).optional(),
  provider: z.enum(["openai", "gemini", "ollama", "mock"]).optional(),
  portfolio: z.array(z.object({
    symbol: z.string().trim().min(1).max(24),
    quantity: z.number().finite(),
    avgPrice: z.number().finite(),
  })).max(50).optional(),
});

export type AskAIInput = z.input<typeof askInput>;

/**
 * Browser-safe Q&A call. The server route performs validation and invokes the
 * server-only reasoning engine. Keep this function's `{ data }` contract so
 * existing Q&A UI callers do not need to change.
 */
export async function askAI({ data }: { data: AskAIInput }): Promise<AIReasoningResult> {
  let response: Response;
  try {
    response = await fetch("/api/ai/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(data),
    });
  } catch {
    return {
      ok: false,
      error: {
        code: "CONTEXT_ERROR",
        message: "The AI research server could not be reached. Make sure the ChetanMarkets AI server is running and try again.",
        intent: null,
        symbols: data.symbols ?? [],
      },
    };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");
    return {
      ok: false,
      error: {
        code: "CONTEXT_ERROR",
        message: `AI research endpoint returned HTTP ${response.status}${text ? `: ${text.slice(0, 180)}` : "."}`,
        intent: null,
        symbols: data.symbols ?? [],
      },
    };
  }

  return (await response.json()) as AIReasoningResult;
}

/** Cheap, model-free routing preview — useful for diagnostics and tests. */
export const classifyQuestion = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ question: z.string().trim().min(1).max(600) }).parse(data),
  )
  .handler(
    async ({ data }): Promise<{ classification: IntentClassification; plan: AIRoutePlan }> =>
      routeQuestion(data.question),
  );

/** Which providers are configured in this environment. */
export const getAIProviderStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { providerStatus } = await import("./ai/providers/registry.server");
  return providerStatus();
});
