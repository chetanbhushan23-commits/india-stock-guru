export type DataFreshness = "fresh" | "stale" | "unknown";
export type EvidenceState = "verified" | "stale" | "conflict" | "missing" | "unverified";

export type QAContext = {
  question: string;
  symbol?: string;
  intent?: string;
  timeframe?: string;
  evidenceIds: string[];
  missingInformation: string[];
};

export type QAClaim = {
  claim: string;
  evidenceIds: string[];
  state: EvidenceState;
  freshness: DataFreshness;
  confidence: number;
};

export type QAValidation = {
  valid: boolean;
  confidence: number;
  unsupportedClaims: string[];
  missingInformation: string[];
  warnings: string[];
};

export function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/g, " ");
}

export function buildQAContext(question: string, options: Partial<Omit<QAContext, "question">> = {}): QAContext {
  return {
    question: normalizeQuestion(question),
    symbol: options.symbol?.trim().toUpperCase(),
    intent: options.intent,
    timeframe: options.timeframe,
    evidenceIds: [...new Set(options.evidenceIds ?? [])],
    missingInformation: [...new Set((options.missingInformation ?? []).filter(Boolean))],
  };
}

export function validateClaims(claims: QAClaim[]): QAValidation {
  const unsupportedClaims = claims.filter((c) => !c.evidenceIds.length || c.state === "missing" || c.state === "unverified").map((c) => c.claim);
  const warnings = claims.filter((c) => c.state === "conflict" || c.state === "stale" || c.freshness !== "fresh").map((c) => c.claim);
  if (!claims.length) return { valid: false, confidence: 0, unsupportedClaims: [], missingInformation: ["No evidence-backed claims available"], warnings: [] };
  const supported = claims.filter((c) => c.evidenceIds.length && c.state === "verified");
  const confidence = Math.max(0, Math.min(100, Math.round(supported.reduce((s, c) => s + Math.max(0, Math.min(100, c.confidence)), 0) / claims.length - warnings.length * 8)));
  return { valid: unsupportedClaims.length === 0, confidence, unsupportedClaims, missingInformation: unsupportedClaims.length ? ["Some claims could not be verified"] : [], warnings };
}

export function canPublishAnswer(validation: QAValidation): boolean {
  return validation.valid && validation.confidence >= 50;
}
