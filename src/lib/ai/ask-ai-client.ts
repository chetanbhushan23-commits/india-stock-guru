import type { AIReasoningRequest, AIReasoningResult } from "./ai-types";

/**
 * Browser-safe Q&A transport.
 * Uses a normal same-origin HTTP endpoint instead of the generated server-function
 * RPC so the research workspace also works reliably in Vite/Nitro preview and
 * deployed worker environments.
 */
export async function askAIHttp(request: AIReasoningRequest): Promise<AIReasoningResult> {
  let response: Response;

  try {
    response = await fetch("/api/ai/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(request),
    });
  } catch {
    return {
      ok: false,
      error: {
        code: "CONTEXT_ERROR",
        message: "The AI research server could not be reached. Make sure the ChetanMarkets AI server is running and try again.",
        intent: null,
        symbols: request.symbols ?? [],
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
        symbols: request.symbols ?? [],
      },
    };
  }

  const result = (await response.json()) as AIReasoningResult;
  return result;
}
