import type { AIAnswer, AIClaim } from "./ai-types";

export type QAHistoryItem = {
  id: string;
  question: string;
  answer: AIAnswer;
  createdAt: string;
  pinned: boolean;
};

const HISTORY_KEY = "dalal-desk-ai-qa-history-v1";

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

export function loadQAHistory(): QAHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function saveQAHistory(items: QAHistoryItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 50)));
}

export function addQAHistory(answer: AIAnswer, previous: QAHistoryItem[]): QAHistoryItem[] {
  const item: QAHistoryItem = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, question: answer.question, answer, createdAt: new Date().toISOString(), pinned: false };
  const next = [item, ...previous.filter((entry) => entry.question !== answer.question)];
  saveQAHistory(next);
  return next;
}
