/**
 * AIResponseFormatter — validates and normalises raw model JSON into the
 * mandatory 10-part AIAnswer.
 */

import { sourcesFor } from "./ai-context-selector";
import {
  INSUFFICIENT_EVIDENCE_MESSAGE,
  type AIAnswer,
  type AIClaim,
  type AIIntent,
  type AISelectedContext,
} from "./ai-types";

type RawClaim = { statement?: unknown; evidenceIds?: unknown };
type RawAnswer = Record<string, unknown>;

const asString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

function normaliseClaims(raw: unknown, knownIds: Set<string>, dropped: { count: number }): AIClaim[] {
  if (!Array.isArray(raw)) return [];
  const out: AIClaim[] = [];
  for (const entry of raw as RawClaim[]) {
    const statement = asString(entry?.statement);
    if (!statement) continue;
    const ids = Array.isArray(entry?.evidenceIds)
      ? [...new Set((entry.evidenceIds as unknown[]).map(asString))].filter((id) => knownIds.has(id))
      : [];
    if (ids.length === 0) {
      dropped.count += 1;
      continue;
    }
    out.push({ statement, evidenceIds: ids });
  }
  return out;
}

export function parseModelJson(raw: string): RawAnswer | null {
  const trimmed = raw.trim();
  const candidate = trimmed.startsWith("{")
    ? trimmed
    : trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1);
  if (!candidate) return null;
  try {
    const parsed: unknown = JSON.parse(candidate);
    return parsed && typeof parsed === "object" ? (parsed as RawAnswer) : null;
  } catch {
    return null;
  }
}

export function insufficientAnswer(params: {
  intent: AIIntent;
  question: string;
  symbols: string[];
  reason: string;
  providerId: string;
  missing?: string[];
}): AIAnswer {
  return {
    version: 1,
    intent: params.intent,
    symbols: params.symbols,
    question: params.question,
    summary: INSUFFICIENT_EVIDENCE_MESSAGE,
    evidence: [],
    technicalEvidence: [],
    fundamentalEvidence: [],
    newsEvidence: [],
    corporateEvents: [],
    risks: [],
    missingInformation: [params.reason, ...(params.missing ?? [])],
    confidence: 0,
    sources: [],
    insufficient: true,
    generatedAt: new Date().toISOString(),
    providerId: params.providerId,
    model: null,
    droppedClaims: 0,
  };
}

const TREND_INTENTS: AIIntent[] = [
  "technical-analysis",
  "swing-trade",
  "explain-movement",
  "why-rise",
  "why-fall",
  "buy-or-wait",
];

function trendFallback(contexts: AISelectedContext[], question: string): {
  summary: string;
  evidence: AIClaim[];
  technicalEvidence: AIClaim[];
} | null {
  if (!TREND_INTENTS.includes(contexts[0]?.evidence.find((item) => item.id.startsWith("derived:direction:")) ? "technical-analysis" : "general-market" as AIIntent)) return null;
  const context = contexts[0];
  const synthesis = context.evidence.find((item) => item.key === "technical.directionalSynthesis");
  if (!synthesis) return null;
  const supporting = context.evidence
    .filter((item) => item.domain === "technical" && item.id !== synthesis.id)
    .sort((a, b) => b.importance * b.reliability - a.importance * a.reliability)
    .slice(0, 4);
  const direction = synthesis.direction === "bullish" ? "bullish" : synthesis.direction === "bearish" ? "bearish" : "neutral/sideways";
  const summary = `${context.ticker}'s current evidence-derived technical bias is ${direction}. ${synthesis.value.kind === "text" ? synthesis.value.value : synthesis.label}. ${supporting.length ? `Key supporting indicators include ${supporting.map((item) => item.label + (item.value.kind === "number" ? ` at ${item.value.value}${item.value.unit === "percent" ? "%" : ""}` : "")).join(", ")}.` : "The available technical evidence is limited, so the bias should be treated as qualified."} This conclusion is based only on the verified research context for the question.`;
  const claim = { statement: synthesis.value.kind === "text" ? synthesis.value.value : `${context.ticker} has a ${direction} technical bias.`, evidenceIds: [synthesis.id] };
  return { summary, evidence: [claim], technicalEvidence: [claim, ...supporting.map((item) => ({ statement: item.label + (item.value.kind === "number" ? `: ${item.value.value}${item.value.unit === "percent" ? "%" : ""}` : `: ${item.value.kind === "text" ? item.value.value : "available"}`), evidenceIds: [item.id] }))] };
}

export function formatAnswer(params: {
  raw: RawAnswer;
  intent: AIIntent;
  question: string;
  contexts: AISelectedContext[];
  providerId: string;
  model: string | null;
}): AIAnswer {
  const { raw, contexts } = params;
  const knownIds = new Set(contexts.flatMap((context) => context.evidence.map((item) => item.id)));
  const dropped = { count: 0 };

  const evidence = normaliseClaims(raw["evidence"], knownIds, dropped);
  const technicalEvidence = normaliseClaims(raw["technicalEvidence"], knownIds, dropped);
  const fundamentalEvidence = normaliseClaims(raw["fundamentalEvidence"], knownIds, dropped);
  const newsEvidence = normaliseClaims(raw["newsEvidence"], knownIds, dropped);
  const corporateEvents = normaliseClaims(raw["corporateEvents"], knownIds, dropped);
  const risks = normaliseClaims(raw["risks"], knownIds, dropped);

  const fallback = TREND_INTENTS.includes(params.intent) ? trendFallback(contexts, params.question) : null;
  const finalEvidence = evidence.length ? evidence : fallback?.evidence ?? [];
  const finalTechnical = technicalEvidence.length ? technicalEvidence : fallback?.technicalEvidence ?? [];
  const allClaims = [
    ...finalEvidence,
    ...finalTechnical,
    ...fundamentalEvidence,
    ...newsEvidence,
    ...corporateEvents,
    ...risks,
  ];
  const citedIds = new Set(allClaims.flatMap((claim) => claim.evidenceIds));

  const symbols = contexts.map((context) => context.symbol);
  const modelSaysInsufficient = raw["insufficient"] === true;
  const modelSummary = asString(raw["summary"]);
  const summary = modelSummary && !modelSaysInsufficient ? modelSummary : fallback?.summary ?? modelSummary;

  const gapNotes = contexts.flatMap((context) => context.gaps.map((gap) => `${context.ticker} · ${gap.label}: ${gap.reason}`));
  const modelMissing = Array.isArray(raw["missingInformation"])
    ? (raw["missingInformation"] as unknown[]).map(asString).filter(Boolean)
    : [];
  const missingInformation = [...new Set([...modelMissing, ...gapNotes])];

  if (allClaims.length === 0 || !summary) {
    return {
      ...insufficientAnswer({
        intent: params.intent,
        question: params.question,
        symbols,
        reason: allClaims.length === 0 ? "The model produced no evidence-backed statements." : "The available evidence did not produce a usable summary.",
        providerId: params.providerId,
      }),
      missingInformation: [...new Set([allClaims.length === 0 ? "The model produced no evidence-backed statements." : "The available evidence did not produce a usable summary.", ...missingInformation])],
      model: params.model,
      droppedClaims: dropped.count,
    };
  }

  const qualityCap = Math.min(...contexts.map((context) => context.quality.overall));
  const modelConfidence = Number(raw["confidence"]);
  const confidence = Math.round(Math.max(0, Math.min(Number.isFinite(modelConfidence) ? Math.min(100, Math.max(0, modelConfidence)) : 50, qualityCap)));

  return {
    version: 1,
    intent: params.intent,
    symbols,
    question: params.question,
    summary,
    evidence: finalEvidence,
    technicalEvidence: finalTechnical,
    fundamentalEvidence,
    newsEvidence,
    corporateEvents,
    risks,
    missingInformation,
    confidence,
    sources: sourcesFor(contexts, citedIds),
    insufficient: false,
    generatedAt: new Date().toISOString(),
    providerId: params.providerId,
    model: params.model,
    droppedClaims: dropped.count,
  };
}
