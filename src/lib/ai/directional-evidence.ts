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

/**
 * Creates attributable computed trend evidence from already-collected facts.
 * Neutral and non-directional technical facts are still valid evidence: they
 * produce a qualified neutral/unclear trend instead of an insufficient-data
 * response.
 */
export function addDirectionalEvidence(context: AISelectedContext, intent: AIIntent): AISelectedContext {
  if (!TREND_INTENTS.includes(intent)) return context;

  const technical = context.evidence.filter((item) => item.domain === "technical");
  const directionalTechnical = technical.filter((item) => item.direction === "bullish" || item.direction === "bearish");
  const trendTechnical = technical.filter(
    (item) => item.tags.includes("trend") || item.key === "technical.trend" || item.key === "technical.supertrend",
  );
  const market = context.evidence.filter((item) => item.domain === "market");
  const directionalMarket = market.filter((item) => item.direction === "bullish" || item.direction === "bearish");

  // Technical evidence has priority. If it has no explicit direction, the
  // correct answer is neutral/unclear—not "insufficient". Market evidence is
  // only used when no technical evidence exists at all.
  const candidates = directionalTechnical.length
    ? directionalTechnical
    : trendTechnical.length
      ? trendTechnical
      : technical.length
        ? technical
        : directionalMarket.length
          ? directionalMarket
          : market;
  if (!candidates.length) return context;

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
    : `${context.ticker} has a ${directionLabel} market bias based on ${strongest.map(valueText).join("; ")}. Technical confirmation is not available in the current evidence set.`;

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
    ...context,
    evidence: [...context.evidence.filter((item) => item.id !== synthesized.id), synthesized],
    byDomain: {
      ...context.byDomain,
      technical: [...(context.byDomain.technical ?? []).filter((id) => id !== synthesized.id), synthesized.id],
    },
  };
}
