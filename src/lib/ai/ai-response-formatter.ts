/** AIResponseFormatter — validates model JSON and deterministically fills evidence-backed sections. */

import { sourcesFor } from "./ai-context-selector";
import { buildConsensus, buildDataQualityGate, buildSourceHealth } from "./source-health";
import { INSUFFICIENT_EVIDENCE_MESSAGE, type AIAnswer, type AIClaim, type AIIntent, type AISelectedContext } from "./ai-types";

type RawClaim = { statement?: unknown; evidenceIds?: unknown };
type RawAnswer = Record<string, unknown>;
const asString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

function normaliseClaims(raw: unknown, knownIds: Set<string>, dropped: { count: number }): AIClaim[] {
  if (!Array.isArray(raw)) return [];
  const out: AIClaim[] = [];
  for (const entry of raw as RawClaim[]) {
    const statement = asString(entry?.statement);
    if (!statement) continue;
    const ids = Array.isArray(entry?.evidenceIds) ? [...new Set((entry.evidenceIds as unknown[]).map(asString))].filter((id) => knownIds.has(id)) : [];
    if (ids.length === 0) { dropped.count += 1; continue; }
    out.push({ statement, evidenceIds: ids });
  }
  return out;
}

export function parseModelJson(raw: string): RawAnswer | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? trimmed.slice(start, end + 1) : "";
  if (!candidate) return null;
  try { const parsed: unknown = JSON.parse(candidate); return parsed && typeof parsed === "object" ? (parsed as RawAnswer) : null; } catch { return null; }
}

export function insufficientAnswer(params: { intent: AIIntent; question: string; symbols: string[]; reason: string; providerId: string; missing?: string[] }): AIAnswer {
  return { version: 1, intent: params.intent, symbols: params.symbols, question: params.question, summary: `Latest evidence date: unavailable. English: ${INSUFFICIENT_EVIDENCE_MESSAGE} Hindi: पर्याप्त सत्यापित साक्ष्य उपलब्ध नहीं हैं।`, evidence: [], technicalEvidence: [], fundamentalEvidence: [], newsEvidence: [], corporateEvents: [], risks: [], missingInformation: [params.reason, ...(params.missing ?? [])], confidence: 0, sources: [], insufficient: true, generatedAt: new Date().toISOString(), providerId: params.providerId, model: null, droppedClaims: 0 };
}

const TREND_INTENTS: AIIntent[] = ["technical-analysis", "swing-trade", "explain-movement", "why-rise", "why-fall", "buy-or-wait"];
function claimFromEvidence(item: AISelectedContext["evidence"][number]): AIClaim {
  const value = item.value.kind === "number" ? `${item.value.value}${item.value.unit === "percent" ? "%" : ""}` : item.value.kind === "text" ? item.value.value : item.value.kind === "boolean" ? String(item.value.value) : "available";
  return { statement: `${item.label}: ${value}`, evidenceIds: [item.id] };
}
function domainFallback(contexts: AISelectedContext[], domains: AISelectedContext["evidence"][number]["domain"][], limit = 6): AIClaim[] {
  return contexts.flatMap((context) => context.evidence.filter((item) => domains.includes(item.domain)).sort((a, b) => b.importance * b.reliability - a.importance * a.reliability).slice(0, limit).map(claimFromEvidence));
}
function latestDate(context: AISelectedContext): string {
  const dates = context.evidence.map((item) => item.observedAt).filter(Boolean).sort();
  return dates.at(-1) ?? context.builtAt.slice(0, 10) ?? "unknown";
}
function trendFallback(contexts: AISelectedContext[], intent: AIIntent): { summary: string; evidence: AIClaim[]; technicalEvidence: AIClaim[] } | null {
  if (!TREND_INTENTS.includes(intent)) return null;
  const context = contexts[0]; if (!context) return null;
  const synthesis = context.evidence.find((item) => item.key === "technical.directionalSynthesis"); if (!synthesis) return null;
  const supporting = context.evidence.filter((item) => item.domain === "technical" && item.id !== synthesis.id).sort((a, b) => b.importance * b.reliability - a.importance * a.reliability).slice(0, 4);
  const direction = synthesis.direction === "bullish" ? "bullish" : synthesis.direction === "bearish" ? "bearish" : "neutral/sideways";
  const hindiDirection = direction === "bullish" ? "तेजी" : direction === "bearish" ? "मंदी" : "न्यूट्रल/साइडवेज";
  const synthesisText = synthesis.value.kind === "text" ? synthesis.value.value : `${context.ticker} has a ${direction} technical bias.`;
  const supportingText = supporting.length ? `Key supporting indicators include ${supporting.map((item) => item.label + (item.value.kind === "number" ? ` at ${item.value.value}${item.value.unit === "percent" ? "%" : ""}` : "")).join(", ")}.` : "The available technical evidence is limited, so the bias should be treated as qualified.";
  const date = latestDate(context);
  return { summary: `Latest evidence date: ${date}. English: ${context.ticker}'s current evidence-derived technical bias is ${direction}. ${synthesisText} ${supportingText} Hindi: ${context.ticker} का मौजूदा सत्यापित तकनीकी रुझान ${hindiDirection} है। उपलब्ध संकेतकों के आधार पर यह निष्कर्ष निकाला गया है; सीमित साक्ष्य होने पर इसे सावधानी से देखें।`, evidence: [{ statement: synthesisText, evidenceIds: [synthesis.id] }], technicalEvidence: [{ statement: synthesisText, evidenceIds: [synthesis.id] }, ...supporting.map(claimFromEvidence)] };
}
const isTransientFetchSummary = (summary: string): boolean => /^(failed to fetch|failed fetching|network error|network request failed|request failed|unable to fetch|fetch failed)[.!]?$/i.test(summary.trim());
const isGenericTrendFailure = (summary: string): boolean => /does not contain enough directional evidence|not enough directional evidence|insufficient.*directional evidence/i.test(summary);

export function formatAnswer(params: { raw: RawAnswer; intent: AIIntent; question: string; contexts: AISelectedContext[]; providerId: string; model: string | null }): AIAnswer {
  const { raw, contexts } = params;
  const knownIds = new Set(contexts.flatMap((context) => context.evidence.map((item) => item.id)));
  const dropped = { count: 0 };
  const evidence = normaliseClaims(raw["evidence"], knownIds, dropped);
  const technicalEvidence = normaliseClaims(raw["technicalEvidence"], knownIds, dropped);
  const fundamentalEvidence = normaliseClaims(raw["fundamentalEvidence"], knownIds, dropped);
  const newsEvidence = normaliseClaims(raw["newsEvidence"], knownIds, dropped);
  const corporateEvents = normaliseClaims(raw["corporateEvents"], knownIds, dropped);
  const risks = normaliseClaims(raw["risks"], knownIds, dropped);
  const fallback = trendFallback(contexts, params.intent);
  const finalEvidence = evidence.length ? evidence : fallback?.evidence ?? domainFallback(contexts, ["market", "technical", "fundamental", "news", "corporate-action", "event"], 8);
  const finalTechnical = technicalEvidence.length ? technicalEvidence : fallback?.technicalEvidence ?? domainFallback(contexts, ["technical"], 8);
  const finalFundamental = fundamentalEvidence.length ? fundamentalEvidence : domainFallback(contexts, ["fundamental"], 8);
  const finalNews = newsEvidence.length ? newsEvidence : domainFallback(contexts, ["news"], 8);
  const finalCorporate = corporateEvents.length ? corporateEvents : domainFallback(contexts, ["corporate-action", "event"], 8);
  const finalRisks = risks.length ? risks : domainFallback(contexts, ["fundamental", "technical", "news", "event"], 6);
  const allClaims = [...finalEvidence, ...finalTechnical, ...finalFundamental, ...finalNews, ...finalCorporate, ...finalRisks];
  const citedIds = new Set(allClaims.flatMap((claim) => claim.evidenceIds));
  const citedSources = sourcesFor(contexts, citedIds);
  const symbols = contexts.map((context) => context.symbol);
  const modelSaysInsufficient = raw["insufficient"] === true;
  const modelSummary = asString(raw["summary"]);
  const genericTrendFailure = isGenericTrendFailure(modelSummary);
  const transientFetchFailure = isTransientFetchSummary(modelSummary);
  const summary = fallback && (modelSaysInsufficient || genericTrendFailure || transientFetchFailure) ? fallback.summary : modelSummary || (finalEvidence[0]?.statement ?? "Evidence-backed research is available in the sections below.");
  const gapNotes = contexts.flatMap((context) => context.gaps.map((gap) => `${context.ticker} · ${gap.label}: ${gap.reason}`));
  const modelMissing = Array.isArray(raw["missingInformation"]) ? (raw["missingInformation"] as unknown[]).map(asString).filter(Boolean) : [];
  const missingInformation = [...new Set([...modelMissing, ...gapNotes])];
  if (allClaims.length === 0 || !summary || (transientFetchFailure && !fallback)) {
    const reason = transientFetchFailure ? "The AI provider returned a transient fetch/network message instead of an evidence-backed answer." : allClaims.length === 0 ? "The model produced no evidence-backed statements." : "The available evidence did not produce a usable summary.";
    return { ...insufficientAnswer({ intent: params.intent, question: params.question, symbols, reason, providerId: params.providerId }), missingInformation: [...new Set([reason, ...missingInformation])], model: params.model, droppedClaims: dropped.count };
  }

  const qualityCap = Math.min(...contexts.map((context) => context.quality.overall));
  const hasFreshEvidence = contexts.some((context) => context.evidence.some((item) => item.observedAt && Date.now() - Date.parse(item.observedAt) <= 7 * 86_400_000));
  const hasAllAnswerDomains = finalTechnical.length > 0 && finalFundamental.length > 0 && finalNews.length > 0 && finalCorporate.length > 0 && finalRisks.length > 0;
  const conflictFree = contexts.every((context) => context.conflicts.length === 0);
  const confidence = hasAllAnswerDomains && citedSources.length >= 5 && hasFreshEvidence && conflictFree ? 100 : Math.round(Math.max(0, Math.min(100, qualityCap)));

  const sourceHealth = contexts.flatMap((context) => buildSourceHealth(context));
  const dataQualityGate = buildDataQualityGate(contexts[0], ["market", "technical", "fundamental", "news"]);
  const consensus = buildConsensus(contexts.flatMap((context) => context.evidence.filter((item) => citedIds.has(item.id))));

  return {
    version: 1, intent: params.intent, symbols, question: params.question, summary,
    evidence: finalEvidence, technicalEvidence: finalTechnical, fundamentalEvidence: finalFundamental,
    newsEvidence: finalNews, corporateEvents: finalCorporate, risks: finalRisks,
    missingInformation, confidence, sources: citedSources, insufficient: false,
    generatedAt: new Date().toISOString(), providerId: params.providerId, model: params.model, droppedClaims: dropped.count,
    sourceHealth, dataQualityGate, consensus,
  };
}