export type QAIntent = "analysis" | "decision" | "news" | "comparison" | "research" | "unknown";

export type ResolvedEntity = {
  symbol: string;
  name: string;
  exchange?: "NSE" | "BSE";
  confidence: number;
};

export type QARequestPlan = {
  question: string;
  intent: QAIntent;
  entity?: ResolvedEntity;
  timeframe?: string;
  needsClarification: boolean;
  clarification?: string;
};

export type QARuntimeResult = {
  ok: boolean;
  answer?: string;
  confidence: number;
  warnings: string[];
  missingInformation: string[];
  evidenceIds: string[];
};

export function normalizeQAInput(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export function createQAPlan(question: string, intent: QAIntent = "unknown", entity?: ResolvedEntity, timeframe?: string): QARequestPlan {
  const normalized = normalizeQAInput(question);
  const needsClarification = !normalized || (!!entity && entity.confidence < 70);
  return {
    question: normalized,
    intent,
    entity,
    timeframe,
    needsClarification,
    clarification: !normalized ? "Please enter a question." : entity && entity.confidence < 70 ? "Please confirm the company or stock symbol." : undefined,
  };
}

export function safeAnswer(result: QARuntimeResult): QARuntimeResult {
  if (!result.ok || !result.answer?.trim()) {
    return {
      ...result,
      ok: false,
      answer: undefined,
      confidence: 0,
      warnings: [...new Set([...result.warnings, "A verified answer could not be generated."])],
    };
  }
  return {
    ...result,
    confidence: Math.max(0, Math.min(100, result.confidence)),
    evidenceIds: [...new Set(result.evidenceIds)],
    warnings: [...new Set(result.warnings)],
    missingInformation: [...new Set(result.missingInformation)],
  };
}
