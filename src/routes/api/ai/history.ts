import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { deleteAIQA, listAIQA } from "@/lib/ai/ai-qa-storage.server";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export const Route = createFileRoute("/api/ai/history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const { limit } = querySchema.parse({ limit: url.searchParams.get("limit") ?? 50 });
        return Response.json({ ok: true, data: await listAIQA(limit) });
      },
      DELETE: async ({ request }) => {
        try {
          const body = deleteSchema.parse(await request.json());
          const deleted = await deleteAIQA(body.id);
          return Response.json({ ok: deleted });
        } catch (error) {
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : "Invalid history request." },
            { status: 400 },
          );
        }
      },
    },
  },
});
