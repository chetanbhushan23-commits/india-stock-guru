/**
 * AI Source Health Engine.
 *
 * Turns provider coverage + evidence metadata into a compact, explainable
 * health model for the AI Q&A UI. This is deterministic: it never invents a
 * provider result and never treats an unconfigured/empty provider as healthy.
 */
import type { ProviderCoverage } from "../news-types";
import type { ResearchConflict, ResearchDomain, ResearchEvidence, ResearchContext } from "../research-types";

export type SourceHealthStatus = "healthy" | "degraded" | "unavailable";

export type SourceHealth = {
  providerId: string;
  providerName: string;
  status: SourceHealthStatus;
  evidenceCount: number;
  freshnessScore: number;
  reliabilityScore: number;
  consensusScore: number;
  healthScore: number;
  latestAt: string | null;
  message: string | null;
};

export type DataQualityGate = {
  passed: boolean;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  reasons: string[];
  unavailableDomains: ResearchDomain[];
  conflicts: number;
};

const freshnessScore = (at: string | null, now = Date.now()) => {
  if (!at) return 0;
  const parsed = Date.parse(at);
  if (!Number.isFinite(parsed)) return 0;
  const ageHours = Math.max(0, (now - parsed) / 3_600_000);
  if (ageHours <= 1) return 100;
  if (ageHours <= 6) return 95;
  if (ageHours <= 24) return 85;
  if (ageHours <= 72) return 70;
  if (ageHours <= 168) return 50;
  if (ageHours <= 720) return 25;
  return 10;
};

const providerName = (id: string) =>
  ({
    nse: "NSE",
    bse: "BSE",
    "google-news": "Google News",
    reuters: "Reuters",
    moneycontrol: "Moneycontrol",
    "economic-times": "Economic Times",
    "business-standard": "Business Standard",
    livemint: "LiveMint",
  } as Record<string, string>)[id] ?? id;

export function buildSourceHealth(
  context: Pick<ResearchContext, "evidence" | "coverage" | "conflicts">,
  newsCoverage: ProviderCoverage[] = [],
  now = Date.now(),
): SourceHealth[] {
  const ids = new Set<string>();
  context.coverage.forEach((item) => ids.add(item.collectorId));
  newsCoverage.forEach((item) => ids.add(item.providerId));
  context.evidence.forEach((item) => ids.add(item.sourceId));

  return [...ids].map((id) => {
    const evidence = context.evidence.filter((item) => item.sourceId === id);
    const domainCoverage = context.coverage.filter((item) => item.collectorId === id);
    const news = newsCoverage.filter((item) => item.providerId === id);
    const latest = [...evidence]
      .map((item) => item.observedAt)
      .filter((item): item is string => Boolean(item))
      .sort()
      .at(-1) ?? null;
    const freshness = freshnessScore(latest, now);
    const reliability = evidence.length
      ? Math.round((evidence.reduce((sum, item) => sum + item.reliability, 0) / evidence.length) * 100)
      : news.some((item) => item.ok) || domainCoverage.some((item) => item.ok) ? 70 : 0;
    const available = evidence.length > 0 || news.some((item) => item.ok) || domainCoverage.some((item) => item.ok);
    const failed = news.some((item) => !item.ok) || domainCoverage.some((item) => !item.ok);
    const sourceDirections = evidence.filter((item) => item.direction !== "neutral");
    const consensus = sourceDirections.length < 2
      ? (evidence.length ? 70 : 0)
      : Math.round((Math.max(
          sourceDirections.filter((item) => item.direction === "bullish").length,
          sourceDirections.filter((item) => item.direction === "bearish").length,
        ) / sourceDirections.length) * 100);
    const score = Math.round(freshness * 0.35 + reliability * 0.35 + consensus * 0.30);
    return {
      providerId: id,
      providerName: providerName(id),
      status: !available ? "unavailable" : failed || score < 60 ? "degraded" : "healthy",
      evidenceCount: evidence.length + news.reduce((sum, item) => sum + item.itemCount, 0),
      freshnessScore: freshness,
      reliabilityScore: reliability,
      consensusScore: consensus,
      healthScore: score,
      latestAt: latest,
      message: news.find((item) => item.message)?.message ?? domainCoverage.find((item) => item.message)?.message ?? null,
    };
  }).sort((a, b) => b.healthScore - a.healthScore);
}

export function buildDataQualityGate(
  context: Pick<ResearchContext, "coverage" | "gaps" | "quality" | "conflicts" | "evidence">,
  requiredDomains: ResearchDomain[],
): DataQualityGate {
  const unavailableDomains = requiredDomains.filter((domain) => {
    const coverage = context.coverage.filter((item) => item.domain === domain);
    const evidence = context.evidence.filter((item) => item.domain === domain);
    return !evidence.length && (!coverage.length || !coverage.some((item) => item.ok));
  });
  const conflictPenalty = Math.min(30, context.conflicts.length * 5);
  const score = Math.max(0, Math.round(context.quality.overall - conflictPenalty));
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 55 ? "D" : "F";
  const reasons: string[] = [];
  if (unavailableDomains.length) reasons.push(`Unavailable: ${unavailableDomains.join(", ")}`);
  if (context.conflicts.length) reasons.push(`${context.conflicts.length} evidence conflict${context.conflicts.length === 1 ? "" : "s"} detected`);
  if (context.quality.freshness < 60) reasons.push("Evidence freshness is below the preferred threshold");
  if (context.quality.reliability < 60) reasons.push("Source reliability is below the preferred threshold");
  if (!reasons.length) reasons.push("Required evidence domains are available and internally consistent");
  return { passed: score >= 70 && unavailableDomains.length === 0, score, grade, reasons, unavailableDomains, conflicts: context.conflicts.length };
}

export function buildConsensus(evidence: ResearchEvidence[]) {
  const directional = evidence.filter((item) => item.direction !== "neutral");
  if (!directional.length) return { state: "neutral" as const, score: 100, bullish: 0, bearish: 0, sources: 0 };
  const bullish = directional.filter((item) => item.direction === "bullish").length;
  const bearish = directional.filter((item) => item.direction === "bearish").length;
  const total = bullish + bearish;
  return {
    state: bullish === bearish ? "mixed" as const : bullish > bearish ? "bullish" as const : "bearish" as const,
    score: Math.round((Math.max(bullish, bearish) / total) * 100),
    bullish,
    bearish,
    sources: new Set(directional.map((item) => item.sourceId)).size,
  };
}
