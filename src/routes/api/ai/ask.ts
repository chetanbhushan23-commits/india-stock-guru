import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { runAIReasoning } from "@/lib/ai/ai-reasoning-engine.server";
import { saveAIQA } from "@/lib/ai/ai-qa-storage.server";

const requestSchema = z.object({
  question: z.string().trim().min(2).max(600),
  symbols: z.array(z.string().trim().min(1).max(24)).max(4).optional(),
  provider: z.enum(["openai", "gemini", "ollama", "mock"]).optional(),
  portfolio: z.array(
    z.object({
      symbol: z.string().trim().min(1).max(24),
      quantity: z.number().finite(),
      avgPrice: z.number().finite(),
    }),
  ).max(50).optional(),
});

export const Route = createFileRoute("/api/ai/ask")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({ ok: true, service: "ChetanMarkets AI Q&A", transport: "http", status: "ready" }),
      POST: async ({ request }) => {
        const startedAt = Date.now();
        try {
          const body = await request.json();
          const data = requestSchema.parse(body);
          const result = await runAIReasoning(data);

          // Storage is deliberately best-effort: a Supabase outage must never
          // turn a valid AI answer into a failed Q&A response.
          if (result.ok && !result.data.insufficient) {
            const stored = await saveAIQA({
              question: data.question,
              answer: result.data,
              startedAt,
            });

            return Response.json({
              ...result,
              storage: {
                enabled: Boolean(stored),
                id: stored?.id ?? null,
                researchDurationMs: Date.now() - startedAt,
              },
            });
          }

          return Response.json({
            ...result,
            storage: { enabled: false, id: null, researchDurationMs: Date.now() - startedAt },
          }, { status: result.ok ? 200 : 502 });
        } catch (error) {
          const message = error instanceof Error ? error.message : "AI research request failed.";
          return Response.json(
            {
              ok: false,
              error: {
                code: "CONTEXT_ERROR",
                message,
                intent: null,
                symbols: [],
              },
              storage: { enabled: false, id: null, researchDurationMs: Date.now() - startedAt },
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
