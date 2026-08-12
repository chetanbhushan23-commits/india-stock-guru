/**
 * Research Context Engine — shared DTOs (client-safe, provider-independent).
 */

export type ResearchDomain =
  | "market"
  | "technical"
  | "fundamental"
  | "news"
  | "corporate-action"
  | "event";

export type EvidenceDirection = "bullish" | "bearish" | "neutral";
export type EvidenceOrigin = "provider" | "computed";

export type EvidenceValue =
  | { kind: "number"; value: number; unit: EvidenceUnit }
  | { kind: "text"; value: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "none" };

export type EvidenceUnit =
  | "currency"
  | "percent"
  | "ratio"
  | "multiple"
  | "count"
  | "price"
  | "score"
  | "none";

export type ResearchEvidence = {
  id: string;
  domain: ResearchDomain;
  key: string;
  label: string;
  value: EvidenceValue;
  direction: EvidenceDirection;
  importance: number;
  reliability: number;
  origin: EvidenceOrigin;
  sourceId: string;
  sourceName: string;
  observedAt: string | null;
  url: string | null;
  note: string | null;
  tags: string[];
};

export type ResearchTimelineEntry = {
  id: string;
  at: string;
  domain: ResearchDomain;
  title: string;
  detail: string | null;
  importance: number;
  direction: EvidenceDirection;
  sourceId: string;
  url: string | null;
  evidenceIds: string[];
};

export type ResearchTimeline = {
  from: string | null;
  to: string | null;
  entries: ResearchTimelineEntry[];
};

export type ResearchConflict = {
  id: string;
  topic: string;
  description: string;
  evidenceIds: string[];
  domains: ResearchDomain[];
  severity: number;
};

export type ResearchGap = {
  domain: ResearchDomain;
  key: string;
  label: string;
  reason: string;
};

export type ResearchDomainCoverage = {
  domain: ResearchDomain;
  collectorId: string;
  ok: boolean;
  evidenceCount: number;
  completeness: number;
  durationMs: number;
  message: string | null;
};

export type ResearchSummary = {
  totalEvidence: number;
  byDomain: Record<ResearchDomain, number>;
  byDirection: Record<EvidenceDirection, number>;
  topEvidenceIds: string[];
  conflictCount: number;
  gapCount: number;
  freshestAt: string | null;
  stalestAt: string | null;
};

export type EvidenceQuality = {
  overall: number;
  coverage: number;
  reliability: number;
  freshness: number;
  consistency: number;
  grade: "high" | "medium" | "low" | "insufficient";
  notes: string[];
};

export type ResearchContext = {
  version: 1;
  symbol: string;
  ticker: string;
  exchange: "NSE" | "BSE" | null;
  companyName: string | null;
  currency: string | null;
  builtAt: string;
  request: ResearchRequest;
  evidence: ResearchEvidence[];
  timeline: ResearchTimeline;
  conflicts: ResearchConflict[];
  gaps: ResearchGap[];
  coverage: ResearchDomainCoverage[];
  summary: ResearchSummary;
  quality: EvidenceQuality;
};

export type ResearchRequest = {
  symbol: string;
  domains: ResearchDomain[];
  interval: "1d" | "1wk" | "1mo";
  range: "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "max";
  quarters: number;
  years: number;
  newsLimit: number;
  newsSinceDays: number;
};

export type ResearchErrorCode =
  | "INVALID_REQUEST"
  | "ALL_COLLECTORS_FAILED"
  | "NO_EVIDENCE"
  | "COLLECTOR_ERROR";

export type ResearchError = {
  code: ResearchErrorCode;
  symbol: string;
  message: string;
  coverage: ResearchDomainCoverage[];
};

export type ResearchContextResult =
  | { ok: true; data: ResearchContext }
  | { ok: false; error: ResearchError };

/** All core research domains are collected by default. */
export const DEFAULT_RESEARCH_DOMAINS: ResearchDomain[] = [
  "market",
  "technical",
  "fundamental",
  "news",
  "corporate-action",
  "event",
];

export const QUALITY_WEIGHTS = {
  coverage: 0.35,
  reliability: 0.25,
  freshness: 0.2,
  consistency: 0.2,
} as const;
