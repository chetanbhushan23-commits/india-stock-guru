import type { AIAnswer } from "./ai-types";

const getSupabaseConfig = () => ({
  url: process.env.SUPABASE_URL?.replace(/\/$/, ""),
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

export type StoredAIQA = {
  id: string;
  question: string;
  symbols: string[];
  answer: AIAnswer;
  created_at: string;
  research_duration_ms: number | null;
  latest_evidence_date: string | null;
  pinned: boolean;
};

/** Server-only persistence. The service-role key must never reach the browser. */
export async function saveAIQA(params: {
  question: string;
  answer: AIAnswer;
  startedAt: number;
}): Promise<StoredAIQA | null> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  if (!url || !serviceRoleKey) return null;

  const createdAt = new Date().toISOString();
  const latestEvidenceDate = params.answer.sources
    .map((source) => source.observedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  const payload = {
    question: params.question,
    symbols: params.answer.symbols,
    answer: params.answer,
    provider_id: params.answer.providerId,
    model: params.answer.model,
    intent: params.answer.intent,
    confidence: params.answer.confidence,
    generated_at: params.answer.generatedAt,
    latest_evidence_date: latestEvidenceDate,
    research_duration_ms: Math.max(0, Date.now() - params.startedAt),
    pinned: false,
  };

  const response = await fetch(`${url}/rest/v1/ai_qa_history`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error("AI Q&A storage failed:", await response.text());
    return null;
  }

  const rows = (await response.json()) as StoredAIQA[];
  return rows[0] ?? null;
}

export async function listAIQA(limit = 50): Promise<StoredAIQA[]> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  if (!url || !serviceRoleKey) return [];

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const response = await fetch(
    `${url}/rest/v1/ai_qa_history?select=*&order=created_at.desc&limit=${safeLimit}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!response.ok) {
    console.error("AI Q&A history load failed:", await response.text());
    return [];
  }

  return (await response.json()) as StoredAIQA[];
}

export async function deleteAIQA(id: string): Promise<boolean> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  if (!url || !serviceRoleKey || !id) return false;

  const response = await fetch(
    `${url}/rest/v1/ai_qa_history?id=eq.${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  return response.ok;
}
