import type { AIAnswer, AIClaim } from "./ai-types";

export type QAHistoryItem = {
  id: string;
  question: string;
  answer: AIAnswer;
  createdAt: string;
  pinned: boolean;
};

export function claimText(claims: AIClaim[]): string[] {
  return claims.map((claim) => claim.statement).filter(Boolean);
}

export function answerSections(answer: AIAnswer) {
  return [
    { key: "summary", title: "Executive Summary", text: answer.summary },
    { key: "technical", title: "Technical Analysis", claims: answer.technicalEvidence },
    { key: "fundamental", title: "Fundamental Analysis", claims: answer.fundamentalEvidence },
    { key: "news", title: "News Analysis", claims: answer.newsEvidence },
    { key: "corporate", title: "Corporate Actions", claims: answer.corporateEvents },
    { key: "risks", title: "Risks", claims: answer.risks },
  ];
}

export function qualityScore(answer: AIAnswer): number {
  const sourceCoverage = Math.min(1, answer.sources.length / 5);
  const claimCoverage = Math.min(1, answer.evidence.length / 4);
  const sectionCoverage = [answer.summary, answer.technicalEvidence.length, answer.fundamentalEvidence.length, answer.newsEvidence.length, answer.corporateEvents.length, answer.risks.length].filter(Boolean).length / 6;
  const freshness = answer.sources.some((source) => source.observedAt) ? 1 : 0.65;
  const raw = Math.round(sourceCoverage * 30 + claimCoverage * 25 + sectionCoverage * 30 + freshness * 15);
  return Math.max(0, Math.min(100, answer.insufficient ? Math.min(raw, answer.confidence) : Math.min(100, Math.round((raw + answer.confidence) / 2))));
}

export function confidenceLabel(score: number) {
  if (score >= 80) return "High";
  if (score >= 60) return "Medium";
  return "Low";
}

/**
 * History is no longer persisted in localStorage. Supabase is the permanent
 * source of truth; this function only preserves the current in-memory UI list.
 */
export function loadQAHistory(): QAHistoryItem[] {
  return [];
}

/** Intentionally a no-op: permanent persistence happens on the server. */
export function saveQAHistory(_items: QAHistoryItem[]) {
  // Supabase persistence is handled by POST /api/ai/ask and /api/ai/history.
}

export function addQAHistory(answer: AIAnswer, previous: QAHistoryItem[]): QAHistoryItem[] {
  const item: QAHistoryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    question: answer.question,
    answer,
    createdAt: new Date().toISOString(),
    pinned: false,
  };
  return [item, ...previous.filter((entry) => entry.question !== answer.question)].slice(0, 50);
}

/** Load permanent server history for UI consumers that need cross-refresh history. */
export async function loadQAHistoryFromServer(limit = 50): Promise<QAHistoryItem[]> {
  try {
    const response = await fetch(`/api/ai/history?limit=${Math.min(Math.max(limit, 1), 100)}`);
    if (!response.ok) return [];
    const payload = (await response.json()) as { ok?: boolean; data?: Array<{ id: string; question: string; answer: AIAnswer; created_at: string; pinned: boolean }> };
    if (!payload.ok || !Array.isArray(payload.data)) return [];
    return payload.data.map((item) => ({
      id: item.id,
      question: item.question,
      answer: item.answer,
      createdAt: item.created_at,
      pinned: item.pinned,
    }));
  } catch {
    return [];
  }
}
