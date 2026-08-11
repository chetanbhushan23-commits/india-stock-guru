/**
 * Development fallback provider.
 *
 * This provider is deliberately deterministic and offline. It never invents
 * market facts; it derives a qualified summary only from ResearchContext
 * evidence supplied by AIReasoningEngine. Hosted/local AI providers remain
 * preferred whenever configured.
 */

import type { AIProvider, AIProviderRequest, AIProviderResponse } from "../ai-types";

type PromptEvidence = {
  id: string;
  domain: string;
  label: string;
  value?: { kind: string; value?: unknown; unit?: string };
  direction?: string;
  reliability?: number;
  at?: string | null;
};

type PromptContext = { symbol?: string; evidence?: PromptEvidence[]; gaps?: string[] };

const render = (item: PromptEvidence): string => {
  const value = item.value;
  const rendered = value && value.kind === "number"
    ? `${value.value}${value.unit === "percent" ? "%" : ""}`
    : value && (value.kind === "text" || value.kind === "boolean") ? String(value.value) : "reported";
  const dated = item.at ? ` (as of ${item.at.slice(0, 10)})` : "";
  return `${item.label}: ${rendered}${dated}.`;
};

function readContext(user: string): PromptContext[] {
  const marker = user.indexOf("RESEARCH CONTEXT");
  const start = marker >= 0 ? user.indexOf("[", marker) : -1;
  const end = user.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  try {
    const parsed = JSON.parse(user.slice(start, end + 1)) as PromptContext[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

const claims = (items: PromptEvidence[], limit: number) =>
  items.slice(0, limit).map((item) => ({ statement: render(item), evidenceIds: [item.id] }));

function directionalClaim(evidence: PromptEvidence[], symbol: string) {
  const directional = evidence.filter((item) => item.direction === "bullish" || item.direction === "bearish");
  if (!directional.length) return null;
  const bullish = directional.filter((item) => item.direction === "bullish");
  const bearish = directional.filter((item) => item.direction === "bearish");
  if (bullish.length > bearish.length) return { statement: `${symbol} has more bullish directional evidence than bearish directional evidence in the supplied research context.`, evidenceIds: bullish.slice(0, 3).map((item) => item.id) };
  if (bearish.length > bullish.length) return { statement: `${symbol} has more bearish directional evidence than bullish directional evidence in the supplied research context.`, evidenceIds: bearish.slice(0, 3).map((item) => item.id) };
  return { statement: `${symbol} has mixed directional evidence in the supplied research context; the available directional signals are balanced.`, evidenceIds: directional.slice(0, 4).map((item) => item.id) };
}

function confidence(contexts: PromptContext[]): number {
  const evidence = contexts.flatMap((context) => context.evidence ?? []);
  if (!evidence.length) return 0;
  const reliability = evidence.reduce((sum, item) => sum + Math.max(0, Math.min(1, item.reliability ?? 0.5)), 0) / evidence.length;
  const dated = evidence.filter((item) => Boolean(item.at)).length / evidence.length;
  const domainCoverage = Math.min(1, new Set(evidence.map((item) => item.domain)).size / 4);
  return Math.round(Math.max(0, Math.min(100, reliability * 55 + dated * 20 + domainCoverage * 25)));
}

async function complete(request: AIProviderRequest): Promise<AIProviderResponse> {
  const contexts = readContext(request.user);
  const evidence = contexts.flatMap((item) => item.evidence ?? []);
  const symbol = contexts[0]?.symbol ?? "the selected stock";
  const direction = directionalClaim(evidence, symbol);
  const technical = evidence.filter((item) => item.domain === "technical");
  const fundamental = evidence.filter((item) => item.domain === "fundamental");
  const news = evidence.filter((item) => item.domain === "news");
  const corporate = evidence.filter((item) => item.domain === "corporate-action" || item.domain === "event");
  const risks = evidence.filter((item) => item.direction === "bearish");
  const gaps = [...new Set(contexts.flatMap((item) => item.gaps ?? []))];
  const answer = {
    summary: direction ? `${direction.statement} This is an evidence-based directional reading, not a buy/sell recommendation.` : evidence.length ? `The supplied research context contains ${evidence.length} evidence item(s) for ${symbol}, but it does not contain enough directional evidence to determine a trend.` : "",
    evidence: direction ? [direction, ...claims(evidence, 4)] : claims(evidence, 5),
    technicalEvidence: claims(technical, 5), fundamentalEvidence: claims(fundamental, 5), newsEvidence: claims(news, 5),
    corporateEvents: claims(corporate, 5), risks: claims(risks, 4), missingInformation: gaps,
    confidence: confidence(contexts), insufficient: evidence.length === 0,
  };
  return { raw: JSON.stringify(answer), model: "grounded-fallback-1" };
}

export const mockProvider: AIProvider = { id: "mock", name: "Grounded fallback (development)", isConfigured: () => true, complete };
