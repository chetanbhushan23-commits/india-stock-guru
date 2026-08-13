/**
 * AIContextSelector — narrows a ResearchContext down to the evidence the
 * routed intent actually needs, while preserving cross-domain coverage.
 */

import type { AIRoutePlan, AISelectedContext, AISource } from "./ai-types";
import type { ResearchContext, ResearchDomain, ResearchEvidence } from "../research-types";

const DOMAIN_KEYS: ResearchDomain[] = ["market", "technical", "fundamental", "news", "corporate-action", "event"];

const DOMAIN_BIAS: Partial<Record<AIRoutePlan["intent"], Partial<Record<ResearchDomain, number>>>> = {
  "technical-analysis": { technical: 25, market: 8 },
  "swing-trade": { technical: 22, market: 10, news: 4 },
  "fundamental-analysis": { fundamental: 25, market: 5 },
  "long-term": { fundamental: 22, news: 4 },
  "news-analysis": { news: 25, event: 12, "corporate-action": 10 },
  "corporate-actions": { "corporate-action": 30, event: 20, news: 10 },
  "why-fall": { news: 14, market: 12, technical: 8 },
  "why-rise": { news: 14, market: 12, technical: 8 },
  "explain-movement": { market: 18, technical: 10, news: 10 },
  "risk-analysis": { fundamental: 12, technical: 10, news: 8, event: 8 },
  portfolio: { market: 15, fundamental: 8 },
  "general-market": { market: 18, news: 12 },
  "buy-or-wait": { market: 10, technical: 12, fundamental: 12 },
  "compare-stocks": { market: 12, fundamental: 12, technical: 8 },
};

/** Evidence-source trust is deliberately additive, never a license to invent facts. */
const SOURCE_PRIORITY: Record<string, number> = {
  nse: 16,
  bse: 16,
  "exchange-filings": 15,
  "investor-relations": 13,
  crisil: 12,
  icra: 12,
  care: 12,
  "india-ratings": 12,
  brickwork: 11,
  reuters: 9,
  moneycontrol: 6,
  "economic-times": 6,
  "business-standard": 6,
  livemint: 5,
  "google-news": 2,
};

const freshnessBoost = (observedAt: string | null): number => {
  if (!observedAt) return 0;
  const ageDays = (Date.now() - Date.parse(observedAt)) / 86_400_000;
  if (!Number.isFinite(ageDays) || ageDays < 0) return 0;
  if (ageDays <= 1) return 12;
  if (ageDays <= 7) return 8;
  if (ageDays <= 30) return 4;
  return 0;
};

const sourcePriority = (sourceId: string): number => SOURCE_PRIORITY[sourceId.toLowerCase()] ?? 0;

const score = (evidence: ResearchEvidence, plan: AIRoutePlan): number =>
  evidence.importance +
  (DOMAIN_BIAS[plan.intent]?.[evidence.domain] ?? 0) +
  evidence.reliability * 10 +
  sourcePriority(evidence.sourceId) +
  freshnessBoost(evidence.observedAt);

/**
 * Keep the best item from every populated domain first, then spend the
 * remaining evidence budget on intent-ranked items. This prevents a strong
 * technical domain from crowding corporate actions/news/fundamentals out of
 * the answer tabs.
 */
function selectWithDomainFloor(ranked: ResearchEvidence[], budget: number): ResearchEvidence[] {
  const selected: ResearchEvidence[] = [];
  const selectedIds = new Set<string>();
  for (const domain of DOMAIN_KEYS) {
    const first = ranked.find((item) => item.domain === domain);
    if (first && selected.length < budget) {
      selected.push(first);
      selectedIds.add(first.id);
    }
  }
  for (const item of ranked) {
    if (selected.length >= budget) break;
    if (selectedIds.has(item.id)) continue;
    selected.push(item);
    selectedIds.add(item.id);
  }
  return selected;
}

export function selectContext(context: ResearchContext, plan: AIRoutePlan): AISelectedContext {
  const ranked = [...context.evidence].sort((a, b) => score(b, plan) - score(a, plan));
  const kept = selectWithDomainFloor(ranked, Math.max(plan.evidenceBudget, DOMAIN_KEYS.length));
  const keptIds = new Set(kept.map((item) => item.id));

  const byDomain = Object.fromEntries(DOMAIN_KEYS.map((key) => [key, [] as string[]])) as Record<ResearchDomain, string[]>;
  for (const item of kept) byDomain[item.domain].push(item.id);

  return {
    symbol: context.symbol,
    ticker: context.ticker,
    companyName: context.companyName,
    exchange: context.exchange,
    currency: context.currency,
    builtAt: context.builtAt,
    evidence: kept,
    timeline: context.timeline.entries.filter((entry) => entry.evidenceIds.length === 0 || entry.evidenceIds.some((id) => keptIds.has(id))),
    conflicts: context.conflicts.filter((conflict) => conflict.evidenceIds.some((id) => keptIds.has(id))),
    gaps: context.gaps,
    coverage: context.coverage,
    quality: context.quality,
    byDomain,
    droppedIds: ranked.filter((item) => !keptIds.has(item.id)).map((item) => item.id),
  };
}

export function sourcesFor(contexts: AISelectedContext[], citedIds: Set<string>): AISource[] {
  const seen = new Map<string, AISource>();
  for (const context of contexts) {
    for (const item of context.evidence) {
      if (!citedIds.has(item.id)) continue;
      const key = `${item.sourceId}|${item.url ?? ""}`;
      const existing = seen.get(key);
      if (existing) {
        if (!existing.observedAt || (item.observedAt && item.observedAt > existing.observedAt)) existing.observedAt = item.observedAt;
        continue;
      }
      seen.set(key, { id: item.sourceId, name: item.sourceName, url: item.url, domain: item.domain, observedAt: item.observedAt });
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function meetsRequirements(contexts: AISelectedContext[], plan: AIRoutePlan): { ok: boolean; reason: string | null } {
  if (contexts.length === 0) return { ok: false, reason: "No research context was supplied." };
  for (const context of contexts) {
    if (context.evidence.length === 0) return { ok: false, reason: `No evidence available for ${context.symbol}.` };
    const missing = plan.requiredDomains.filter((domain) => (context.byDomain[domain] ?? []).length === 0);
    if (missing.length > 0) return { ok: false, reason: `Missing required evidence domains for ${context.symbol}: ${missing.join(", ")}.` };
    if (context.quality.overall < plan.minQuality) return { ok: false, reason: `Evidence quality for ${context.symbol} (${Math.round(context.quality.overall)}) is below the ${plan.minQuality} threshold for this question.` };
  }
  return { ok: true, reason: null };
}

export function canUsePartialEvidence(contexts: AISelectedContext[], plan: AIRoutePlan): { ok: boolean; reason: string | null } {
  if (contexts.length === 0) return { ok: false, reason: "No research context was supplied." };
  for (const context of contexts) {
    if (context.evidence.length === 0) return { ok: false, reason: `No evidence available for ${context.symbol}.` };
    if (context.quality.overall < Math.max(25, Math.min(plan.minQuality, 35))) return { ok: false, reason: `Evidence quality for ${context.symbol} is too low for a qualified answer.` };
    const available = plan.domains.filter((domain) => (context.byDomain[domain] ?? []).length > 0);
    if (available.length === 0) return { ok: false, reason: `No requested evidence domain is available for ${context.symbol}.` };
  }
  return { ok: true, reason: null };
}
