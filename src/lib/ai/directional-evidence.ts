import type { AIIntent, AISelectedContext } from "./ai-types";
import type { ResearchEvidence } from "../research-types";

const TREND_INTENTS: AIIntent[] = [
  "technical-analysis",
  "swing-trade",
  "explain-movement",
  "why-rise",
  "why-fall",
  "buy-or-wait",
];

function valueText(item: ResearchEvidence): string {
  if (item.value.kind === "number") return `${item.label}: ${item.value.value}${item.value.unit === "percent" ? "%" : ""}`;
  if (item.value.kind === "text") return `${item.label}: ${item.value.value}`;
  if (item.value.kind === "boolean") return `${item.label}: ${item.value.value ? "yes" : "no"}`;
  return item.label;
}

const isDerivedDirectionalSynthesis = (item: ResearchEvidence) =>
  item.origin === "computed" && item.key === "technical.directionalSynthesis";

/**
 * Creates one attributable computed trend evidence item from already-collected
 * facts. Existing derived synthesis items are ignored as inputs so repeated
 * enrichment can never wrap a previous synthesis inside another synthesis.
 */
export function addDirectionalEvidence(context: AISelectedContext, intent: AIIntent): AISelectedContext {
  if (!TREND_INTENTS.includes(intent)) return context;

  const baseEvidence = context.evidence.filter((item) => !isDerivedDirectionalSynthesis(item));
  const technicalAll = baseEvidence.filter((item) => item.domain === "technical" && item.direction);
  const marketAll = baseEvidence.filter((item) => item.domain === "market" && item.direction);
  const technical = technicalAll.filter((item) => item.direction !== "neutral");
  const market = marketAll.filter((item) => item.direction !== "neutral");
  const candidates = technical.length ? technical : market.length ? market : technicalAll.length ? technicalAll : marketAll;

  const existingIds = context.evidence.filter(isDerivedDirectionalSynthesis).map((item) => item.id);
  const withoutOldSynthesis: AISelectedContext = {
    ...context,
    evidence: baseEvidence,
    byDomain: {
      ...context.byDomain,
      technical: (context.byDomain.technical ?? []).filter((id) => !existingIds.includes(id)),
      market: (context.byDomain.market ?? []).filter((id) => !existingIds.includes(id)),
    },
  };

  if (!candidates.length) return withoutOldSynthesis;

  if (!technical.length && !market.length) {
    const flatPool = technicalAll.length ? technicalAll : marketAll;
    const strongestFlat = [...flatPool]
      .sort((a, b) => b.importance * b.reliability - a.importance * a.reliability)
      .slice(0, 6);
    const flatEvidenceIds = strongestFlat.map((item) => item.id);
    const hasTechnical = technicalAll.length > 0;
    const flatStatement = hasTechnical
      ? `${context.ticker} shows a range-bound/neutral technical picture: ${strongestFlat.map(valueText).join("; ")}. No indicator is showing a clear bullish or bearish bias right now.`
      : `${context.ticker} shows a range-bound/neutral market picture: ${strongestFlat.map(valueText).join("; ")}. Technical confirmation is genuinely unavailable because no technical indicator evidence was collected.`;
    const flatSynthesized: ResearchEvidence = {
      id: `derived:direction:${context.symbol}:${intent}`,
      domain: "technical",
      key: "technical.directionalSynthesis",
      label: hasTechnical ? "Technical directional synthesis" : "Market directional synthesis",
      value: { kind: "text", value: flatStatement },
      direction: "neutral",
      importance: 100,
      reliability: strongestFlat.length ? Math.max(...strongestFlat.map((item) => item.reliability)) : 0,
      origin: "computed",
      sourceId: "evidence-synthesis-engine",
      sourceName: "Evidence Synthesis Engine",
      observedAt: strongestFlat.find((item) => item.observedAt)?.observedAt ?? context.builtAt,
      url: null,
      note: `Derived only from evidence ids: ${flatEvidenceIds.join(", ")}`,
      tags: ["technical", "trend", "directional-synthesis", "range-bound"],
    };
    return {
      ...withoutOldSynthesis,
      evidence: [...withoutOldSynthesis.evidence, flatSynthesized],
      byDomain: {
        ...withoutOldSynthesis.byDomain,
        technical: [...(withoutOldSynthesis.byDomain.technical ?? []), flatSynthesized.id],
      },
    };
  }

  const bullish = candidates.filter((item) => item.direction === "bullish");
  const bearish = candidates.filter((item) => item.direction === "bearish");
  const neutral = candidates.filter((item) => item.direction === "neutral");
  const unknownDirection = candidates.filter((item) => item.direction !== "bullish" && item.direction !== "bearish" && item.direction !== "neutral");
  const weightedScore = (items: ResearchEvidence[]) => items.reduce((sum, item) => sum + item.importance * Math.max(0, Math.min(1, item.reliability)), 0);
  const bullScore = weightedScore(bullish);
  const bearScore = weightedScore(bearish);
  const neutralScore = weightedScore(neutral) + weightedScore(unknownDirection);
  const directionalTotal = bullScore + bearScore;
  const total = directionalTotal + neutralScore;
  const direction = directionalTotal === 0 ? "neutral" : bullScore === bearScore ? "neutral" : bullScore > bearScore ? "bullish" : "bearish";
  const confidence = total ? Math.round((Math.max(bullScore, bearScore, neutralScore) / total) * 100) : 0;
  const strongest = [...candidates].sort((a, b) => b.importance * b.reliability - a.importance * a.reliability).slice(0, 8);
  const evidenceIds = strongest.map((item) => item.id);
  const hasTechnical = candidates.some((item) => item.domain === "technical");
  const label = hasTechnical ? "Technical directional synthesis" : "Market directional synthesis";
  const directionLabel = direction === "neutral" ? "neutral / no clear directional bias" : direction;
  const statement = hasTechnical
    ? `${context.ticker} has a ${directionLabel} technical bias based on ${strongest.map(valueText).join("; ")}. Directional evidence confidence: ${confidence}/100.`
    : `${context.ticker} has a ${directionLabel} market bias based on ${strongest.map(valueText).join("; ")}. Technical confirmation is genuinely unavailable because no technical indicator evidence was collected.`;

  const synthesized: ResearchEvidence = {
    id: `derived:direction:${context.symbol}:${intent}`,
    domain: "technical",
    key: "technical.directionalSynthesis",
    label,
    value: { kind: "text", value: statement },
    direction,
    importance: 100,
    reliability: strongest.length ? Math.max(...strongest.map((item) => item.reliability)) : 0,
    origin: "computed",
    sourceId: "evidence-synthesis-engine",
    sourceName: "Evidence Synthesis Engine",
    observedAt: strongest.find((item) => item.observedAt)?.observedAt ?? context.builtAt,
    url: null,
    note: `Derived only from evidence ids: ${evidenceIds.join(", ")}`,
    tags: ["technical", "trend", "directional-synthesis"],
  };

  return {
    ...withoutOldSynthesis,
    evidence: [...withoutOldSynthesis.evidence, synthesized],
    byDomain: {
      ...withoutOldSynthesis.byDomain,
      technical: [...(withoutOldSynthesis.byDomain.technical ?? []), synthesized.id],
    },
  };
}
