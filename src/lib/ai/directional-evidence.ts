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
 * It deliberately keeps neutral technical trend facts: a sideways/neutral
 * trend is still a valid answer and must not be mistaken for missing data.
 */
export function addDirectionalEvidence(
  context: AISelectedContext,
  intent: AIIntent,
): AISelectedContext {
  if (!TREND_INTENTS.includes(intent)) return context;

  const directionalTechnical = context.evidence.filter(
    (item) => item.domain === "technical" && item.direction !== "neutral",
  );
  const trendTechnical = context.evidence.filter(
    (item) =>
      item.domain === "technical" &&
      (item.tags.includes("trend") || item.key === "technical.trend" || item.key === "technical.supertrend"),
  );
  const directionalMarket = context.evidence.filter(
    (item) => item.domain === "market" && item.direction !== "neutral",
  );

  // Prefer real directional technical signals. If they are unavailable,
  // retain the engine's explicit trend classification before falling back to
  // market direction. This prevents a valid "sideways/neutral" trend from
  // becoming an artificial evidence gap.
  const candidates = directionalTechnical.length
    ? directionalTechnical
    : trendTechnical.length
      ? trendTechnical
      : directionalMarket;
  if (!candidates.length) return context;

  const bullish = candidates.filter((item) => item.direction === "bullish");
  const bearish = candidates.filter((item) => item.direction === "bearish");
  const neutral = candidates.filter((item) => item.direction === "neutral");
  const weightedScore = (items: ResearchEvidence[]) =>
    items.reduce((sum, item) => sum + item.importance * Math.max(0, Math.min(1, item.reliability)), 0);
  const bullScore = weightedScore(bullish);
  const bearScore = weightedScore(bearish);
  const neutralScore = weightedScore(neutral);
  const directionalTotal = bullScore + bearScore;
  const total = directionalTotal + neutralScore;
  const direction =
    directionalTotal === 0
      ? "neutral"
      : bullScore === bearScore
        ? "neutral"
        : bullScore > bearScore
          ? "bullish"
          : "bearish";
  const confidence = total
    ? Math.round((Math.max(bullScore, bearScore, neutralScore) / total) * 100)
    : 0;
  const strongest = [...candidates]
    .sort((a, b) => b.importance * b.reliability - a.importance * a.reliability)
    .slice(0, 8);
  const evidenceIds = strongest.map((item) => item.id);
  const hasTechnical = candidates.some((item) => item.domain === "technical");
  const label = hasTechnical ? "Technical directional synthesis" : "Market directional synthesis";
  const statement = hasTechnical
    ? `${context.ticker} has a ${direction} technical bias based on ${strongest.map(valueText).join("; ")}. Directional evidence confidence: ${confidence}/100.`
    : `${context.ticker} has a ${direction} market bias based on ${strongest.map(valueText).join("; ")}. Technical confirmation is not available in the current evidence set.`;

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
      technical: [...context.byDomain.technical.filter((id) => id !== synthesized.id), synthesized.id],
    },
  };
}
