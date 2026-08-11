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
 * Creates one attributable, computed evidence item from already-collected
 * directional evidence. It never invents a price, indicator or source.
 * This prevents an AI provider from treating a valid technical evidence set
 * as "non-directional" merely because the model chose not to interpret it.
 */
export function addDirectionalEvidence(
  context: AISelectedContext,
  intent: AIIntent,
): AISelectedContext {
  if (!TREND_INTENTS.includes(intent)) return context;

  const technical = context.evidence.filter((item) => item.domain === "technical" && item.direction !== "neutral");
  const market = context.evidence.filter((item) => item.domain === "market" && item.direction !== "neutral");
  const candidates = technical.length ? technical : market;
  if (!candidates.length) return context;

  const bullish = candidates.filter((item) => item.direction === "bullish");
  const bearish = candidates.filter((item) => item.direction === "bearish");
  const score = (items: ResearchEvidence[]) =>
    items.reduce((sum, item) => sum + item.importance * Math.max(0, Math.min(1, item.reliability)), 0);
  const bullScore = score(bullish);
  const bearScore = score(bearish);
  const total = bullScore + bearScore;
  const direction = bullScore === bearScore ? "neutral" : bullScore > bearScore ? "bullish" : "bearish";
  const confidence = total ? Math.round((Math.max(bullScore, bearScore) / total) * 100) : 0;
  const strongest = [...candidates].sort((a, b) => b.importance - a.importance).slice(0, 6);
  const evidenceIds = strongest.map((item) => item.id);
  const label = technical.length ? "Technical directional synthesis" : "Market directional synthesis";
  const statement = technical.length
    ? `${context.ticker} has a ${direction} technical bias based on ${strongest.map(valueText).join("; ")}. Directional evidence confidence: ${confidence}/100.`
    : `${context.ticker} has a ${direction} market bias based on ${strongest.map(valueText).join("; ")}. Technical trend confirmation is not available in the current evidence set.`;

  const synthesized: ResearchEvidence = {
    id: `derived:direction:${context.symbol}:${intent}`,
    domain: "technical",
    key: "technical.directionalSynthesis",
    label,
    value: { kind: "text", value: statement },
    direction,
    importance: 100,
    reliability: Math.max(...strongest.map((item) => item.reliability), 0),
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
    evidence: [...context.evidence, synthesized],
    byDomain: {
      ...context.byDomain,
      technical: [...context.byDomain.technical, synthesized.id],
    },
  };
}
