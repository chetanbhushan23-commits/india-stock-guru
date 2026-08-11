export type ResearchEvidenceState = "verified" | "stale" | "conflict" | "missing" | "unverified";

export type ResearchEvidence = {
  id: string;
  title: string;
  source?: string;
  url?: string;
  observedAt?: string;
  state: ResearchEvidenceState;
  relevance?: number;
};

export type ResearchPlan = {
  question: string;
  entities: string[];
  timeframe?: string;
  tasks: string[];
};

export type ResearchQuality = {
  score: number;
  confidence: number;
  sourceCoverage: number;
  evidenceCompleteness: number;
  hasConflicts: boolean;
  hasStaleEvidence: boolean;
};

export function buildResearchPlan(question: string, entities: string[] = []): ResearchPlan {
  const clean = question.trim();
  return {
    question: clean,
    entities: [...new Set(entities.filter(Boolean))],
    tasks: ["identify relevant evidence", "verify sources and freshness", "evaluate conflicts", "produce evidence-backed conclusion"],
  };
}

export function calculateResearchQuality(evidence: ResearchEvidence[]): ResearchQuality {
  if (!evidence.length) {
    return { score: 0, confidence: 0, sourceCoverage: 0, evidenceCompleteness: 0, hasConflicts: false, hasStaleEvidence: false };
  }
  const sourceCoverage = evidence.filter((item) => Boolean(item.source || item.url)).length / evidence.length;
  const evidenceCompleteness = evidence.filter((item) => item.state === "verified").length / evidence.length;
  const hasConflicts = evidence.some((item) => item.state === "conflict");
  const hasStaleEvidence = evidence.some((item) => item.state === "stale");
  const score = Math.round((sourceCoverage * 0.35 + evidenceCompleteness * 0.65) * 100);
  const confidence = Math.max(0, Math.min(100, score - (hasConflicts ? 20 : 0) - (hasStaleEvidence ? 10 : 0)));
  return { score, confidence, sourceCoverage, evidenceCompleteness, hasConflicts, hasStaleEvidence };
}

export function canPublishResearch(quality: ResearchQuality): boolean {
  return quality.score >= 60 && quality.confidence >= 50 && !quality.hasConflicts;
}
