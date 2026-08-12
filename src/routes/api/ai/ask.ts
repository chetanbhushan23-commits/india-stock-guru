import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { runAIReasoning } from "@/lib/ai/ai-reasoning-engine.server";

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
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const data = requestSchema.parse(body);
          const result = await runAIReasoning(data);
          return Response.json(result, { status: result.ok ? 200 : 502 });
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
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
