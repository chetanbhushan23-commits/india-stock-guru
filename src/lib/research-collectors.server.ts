/** Server-side ResearchCollector implementations. */

import { exchangeOf, stripSuffix } from "./market-types";
import type { ResearchCollector, CollectorOutput } from "./research-collector";
import { emptyOutput, makeEvidence, textValue, toIso } from "./research-collector";
import { mapFundamental, mapMarketQuote, mapNews, mapTechnical } from "./research-evidence";
import { analyzeCandles } from "./technical-analysis";
import type { Range } from "./technical-types";
import { fetchYahooHistoryFallback } from "./yahoo-history-fallback.server";

const failure = (error: unknown, fallback: string): CollectorOutput =>
  emptyOutput(error instanceof Error ? error.message : fallback, false);

export const marketCollector: ResearchCollector = {
  id: "market-collector",
  domain: "market",
  async collect(request) {
    try {
      const { providerQuotes } = await import("./market-data.server");
      const quotes = await providerQuotes([request.symbol]);
      const quote = quotes[0];
      if (!quote) return emptyOutput(`No quote available for ${request.symbol}.`);
      const mapped = mapMarketQuote(quote, new Date().toISOString());
      return {
        ...mapped,
        identity: { companyName: quote.name, currency: quote.currency, exchange: exchangeOf(quote.symbol) },
        ok: true,
        message: null,
      };
    } catch (error) {
      return failure(error, "Market data collector failed.");
    }
  },
};

export const technicalCollector: ResearchCollector = {
  id: "technical-collector",
  domain: "technical",
  async collect(request) {
    try {
      const { providerHistory } = await import("./market-data.server");
      let candles = [] as Awaited<ReturnType<typeof providerHistory>>;
      try { candles = await providerHistory(request.symbol, request.interval, request.range); } catch { candles = []; }
      let analysis = analyzeCandles(request.symbol, candles, request.interval, request.range);
      if (!analysis.ok) {
        const fallbackRange: Range = request.interval === "1d"
          ? (request.range === "1mo" || request.range === "3mo" ? "1y" : request.range)
          : request.interval === "1wk"
            ? (request.range === "1mo" || request.range === "3mo" ? "2y" : request.range)
            : (request.range === "1mo" || request.range === "3mo" || request.range === "6mo" ? "5y" : request.range);
        candles = await fetchYahooHistoryFallback(request.symbol, request.interval, fallbackRange);
        analysis = analyzeCandles(request.symbol, candles, request.interval, fallbackRange);
      }
      if (!analysis.ok) return emptyOutput(`Technical history unavailable for ${request.symbol}: ${analysis.error.message}`);
      const mapped = mapTechnical(analysis.data);
      return { ...mapped, ok: true, message: null };
    } catch (error) {
      return failure(error, "Technical analysis collector failed.");
    }
  },
};

export const fundamentalCollector: ResearchCollector = {
  id: "fundamental-collector",
  domain: "fundamental",
  async collect(request) {
    try {
      const { runFundamentalAnalysis } = await import("./fundamental-service.server");
      const result = await runFundamentalAnalysis(request.symbol, request.quarters, request.years);
      if (!result.ok) return emptyOutput(result.error.message);
      const mapped = mapFundamental(result.data);
      return {
        ...mapped,
        identity: { companyName: result.data.profile.name, currency: result.data.profile.currency },
        ok: true,
        message: null,
      };
    } catch (error) {
      return failure(error, "Fundamental analysis collector failed.");
    }
  },
};

export const newsCollector: ResearchCollector = {
  id: "news-collector",
  domain: "news",
  async collect(request) {
    try {
      const { aggregateNews } = await import("./news-aggregation.server");
      const result = await aggregateNews({ symbol: request.symbol, query: null, limit: request.newsLimit, sinceDays: request.newsSinceDays });
      if (!result.ok) return emptyOutput(result.error.message);
      const mapped = mapNews(result.data);
      const named = result.data.articles.find((article) => article.company.name);
      return {
        ...mapped,
        identity: { companyName: named?.company.name ?? null, exchange: named?.company.exchange ?? null },
        ok: mapped.evidence.length > 0,
        message: mapped.evidence.length > 0 ? null : `No news items for ${request.symbol} in the last ${request.newsSinceDays} days.`,
      };
    } catch (error) {
      return failure(error, "News intelligence collector failed.");
    }
  },
};

/**
 * Corporate-action collector. It deliberately reuses the exchange-aware news
 * aggregation layer because that layer already combines NSE/BSE filings and
 * normalises dividend/bonus/split/rights/buyback/merger records. A successful
 * empty feed is represented as a bounded coverage fact, not as fake action data.
 */
export const corporateActionCollector: ResearchCollector = {
  id: "corporate-action-collector",
  domain: "corporate-action",
  async collect(request) {
    try {
      const { aggregateNews } = await import("./news-aggregation.server");
      const result = await aggregateNews({ symbol: request.symbol, query: null, limit: Math.max(request.newsLimit, 50), sinceDays: Math.max(request.newsSinceDays, 30) });
      if (!result.ok) return emptyOutput(result.error.message);
      const actions = result.data.corporateActions;
      const out: CollectorOutput = { evidence: [], timeline: [], gaps: [], completeness: 1, ok: true, message: null };
      const now = result.data.fetchedAt;
      for (const action of actions) {
        const observedAt = action.announcedAt ?? action.recordDate ?? action.exDate ?? now;
        const detail = [action.description, action.ratio ? `Ratio ${action.ratio}` : null, action.value !== null ? `Value ${action.value}` : null].filter(Boolean).join(" · ");
        out.evidence.push(makeEvidence({
          domain: "corporate-action",
          key: `corporate-action.${action.kind}`,
          discriminator: action.id,
          label: `${action.kind.replace(/-/g, " ")} action`,
          value: textValue(detail || `${action.kind} action reported by the exchange feed.`),
          importance: 95,
          reliability: Math.max(0.9, action.source.baseReliability),
          origin: "provider",
          direction: "neutral",
          observedAt: toIso(observedAt),
          url: action.url,
          note: action.recordDate ? `Record date: ${action.recordDate}` : action.exDate ? `Ex-date: ${action.exDate}` : null,
          tags: ["corporate-action", action.kind, action.source.kind],
          sourceId: action.source.id,
          sourceName: action.source.name,
        }));
        if (observedAt) out.timeline.push({
          id: `timeline:${action.id}`,
          at: toIso(observedAt) ?? now,
          domain: "corporate-action",
          title: `${action.kind.replace(/-/g, " ")} — ${action.company.name ?? request.symbol}`,
          detail: detail || null,
          importance: 95,
          direction: "neutral",
          sourceId: action.source.id,
          url: action.url,
          evidenceIds: [`corporate-action:corporate-action.${action.kind}:${action.id}`],
        });
      }
      if (actions.length === 0) {
        out.evidence.push(makeEvidence({
          domain: "corporate-action",
          key: "corporate-action.feedCoverage",
          label: "Corporate-action feed coverage",
          value: textValue(`NSE/BSE corporate-action feeds returned no classified corporate actions for ${request.symbol} in the configured ${Math.max(request.newsSinceDays, 30)}-day window.`),
          importance: 35,
          reliability: 0.9,
          origin: "provider",
          direction: "neutral",
          observedAt: now,
          url: null,
          tags: ["corporate-action", "coverage"],
          sourceId: "exchange-action-aggregation",
          sourceName: "NSE/BSE Corporate Action Aggregator",
        }));
      }
      return out;
    } catch (error) {
      return failure(error, "Corporate-action collector failed.");
    }
  },
};

/**
 * Event collector: exchange/IR classified events such as earnings, board
 * meetings, orders, ratings, management changes and regulatory notices.
 */
export const eventCollector: ResearchCollector = {
  id: "event-collector",
  domain: "event",
  async collect(request) {
    try {
      const { aggregateNews } = await import("./news-aggregation.server");
      const result = await aggregateNews({ symbol: request.symbol, query: null, limit: Math.max(request.newsLimit, 50), sinceDays: Math.max(request.newsSinceDays, 30) });
      if (!result.ok) return emptyOutput(result.error.message);
      const events = result.data.events;
      const out: CollectorOutput = { evidence: [], timeline: [], gaps: [], completeness: 1, ok: true, message: null };
      const now = result.data.fetchedAt;
      for (const event of events) {
        const observedAt = event.announcedAt ?? event.eventDate ?? now;
        out.evidence.push(makeEvidence({
          domain: "event",
          key: `event.${event.type}`,
          discriminator: event.id,
          label: `${event.type.replace(/-/g, " ")} event`,
          value: textValue(event.detail ? `${event.title} · ${event.detail}` : event.title),
          importance: 85,
          reliability: Math.max(0.85, event.source.baseReliability),
          origin: "provider",
          direction: "neutral",
          observedAt: toIso(observedAt),
          url: event.url,
          tags: ["event", event.type, event.source.kind],
          sourceId: event.source.id,
          sourceName: event.source.name,
        }));
      }
      if (events.length === 0) {
        out.evidence.push(makeEvidence({
          domain: "event",
          key: "event.feedCoverage",
          label: "Event feed coverage",
          value: textValue(`NSE/BSE/IR event feeds returned no classified company events for ${request.symbol} in the configured ${Math.max(request.newsSinceDays, 30)}-day window.`),
          importance: 30,
          reliability: 0.9,
          origin: "provider",
          direction: "neutral",
          observedAt: now,
          url: null,
          tags: ["event", "coverage"],
          sourceId: "event-aggregation",
          sourceName: "NSE/BSE Event Aggregator",
        }));
      }
      return out;
    } catch (error) {
      return failure(error, "Event intelligence collector failed.");
    }
  },
};

export const RESEARCH_COLLECTORS: ResearchCollector[] = [
  marketCollector,
  technicalCollector,
  fundamentalCollector,
  newsCollector,
  corporateActionCollector,
  eventCollector,
];

export const collectorFor = (domain: string) => RESEARCH_COLLECTORS.find((collector) => collector.domain === domain) ?? null;
export const tickerOf = (symbol: string) => stripSuffix(symbol);
export const nowIso = () => toIso(Date.now()) as string;
