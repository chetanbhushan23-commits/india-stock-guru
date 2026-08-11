/**
 * Market data provider (server-only).
 *
 * Currently talks to Yahoo Finance's public endpoints, which cover NSE (.NS)
 * and BSE (.BO) instruments. Exchange symbol discovery is deliberately kept
 * separate from AI reasoning; research collection remains the evidence layer.
 */

import {
  exchangeOf,
  stripSuffix,
  type Quote,
  type SearchResult,
} from "./market-types";
import type { Candle, Interval, Range } from "./technical-types";

const BASE = "https://query2.finance.yahoo.com";
const CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

type Session = { cookie: string; crumb: string; createdAt: number };
let session: Session | null = null;

async function createSession(): Promise<Session> {
  const seed = await fetch("https://fc.yahoo.com", { headers: { "user-agent": UA } });
  const headers = seed.headers as Headers & { getSetCookie?: () => string[] };
  const raw = headers.getSetCookie?.() ?? [seed.headers.get("set-cookie") ?? ""];
  const cookie = raw
    .filter(Boolean)
    .map((value) => value.split(";")[0])
    .join("; ");

  const crumbRes = await fetch(`${BASE}/v1/test/getcrumb`, {
    headers: { "user-agent": UA, cookie },
  });
  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.includes("<")) throw new Error("Could not authenticate with market data provider");

  return { cookie, crumb, createdAt: Date.now() };
}

async function getSession(refresh = false): Promise<Session> {
  if (refresh || !session || Date.now() - session.createdAt > 20 * 60_000) {
    session = await createSession();
  }
  return session;
}

const nullable = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

type RawQuote = Record<string, unknown>;

function toQuote(raw: RawQuote): Quote {
  const symbol = String(raw['symbol'] ?? "");
  const price = nullable(raw['regularMarketPrice']);
  const previousClose = nullable(raw['regularMarketPreviousClose']);
  return {
    symbol,
    ticker: stripSuffix(symbol),
    name: String(raw['longName'] ?? raw['shortName'] ?? symbol),
    exchange: String(raw['fullExchangeName'] ?? exchangeOf(symbol)),
    currency: String(raw['currency'] ?? "INR"),
    marketState: String(raw['marketState'] ?? "CLOSED"),
    price,
    previousClose,
    change: nullable(raw['regularMarketChange']),
    changePercent: nullable(raw['regularMarketChangePercent']),
    open: nullable(raw['regularMarketOpen']),
    dayHigh: nullable(raw['regularMarketDayHigh']),
    dayLow: nullable(raw['regularMarketDayLow']),
    fiftyTwoWeekHigh: nullable(raw['fiftyTwoWeekHigh']),
    fiftyTwoWeekLow: nullable(raw['fiftyTwoWeekLow']),
    volume: nullable(raw['regularMarketVolume']),
    marketCap: nullable(raw['marketCap']),
  };
}

function chartMetaToQuote(meta: RawQuote): Quote {
  const symbol = String(meta['symbol'] ?? "");
  const price = nullable(meta['regularMarketPrice']);
  const previousClose = nullable(meta['previousClose'] ?? meta['chartPreviousClose']);
  const change = price !== null && previousClose !== null ? price - previousClose : null;
  const changePercent =
    change !== null && previousClose !== null && previousClose !== 0
      ? (change / previousClose) * 100
      : null;
  return {
    symbol,
    ticker: stripSuffix(symbol),
    name: String(meta['longName'] ?? meta['shortName'] ?? symbol),
    exchange: String(meta['fullExchangeName'] ?? meta['exchangeName'] ?? exchangeOf(symbol)),
    currency: String(meta['currency'] ?? "INR"),
    marketState: String(meta['marketState'] ?? "CLOSED"),
    price,
    previousClose,
    change,
    changePercent,
    open: nullable(meta['regularMarketOpen']),
    dayHigh: nullable(meta['regularMarketDayHigh']),
    dayLow: nullable(meta['regularMarketDayLow']),
    fiftyTwoWeekHigh: nullable(meta['fiftyTwoWeekHigh']),
    fiftyTwoWeekLow: nullable(meta['fiftyTwoWeekLow']),
    volume: nullable(meta['regularMarketVolume']),
    marketCap: nullable(meta['marketCap']),
  };
}

/** Full-text discovery across NSE (.NS) and BSE (.BO) equities. */
export async function providerSearch(query: string): Promise<SearchResult[]> {
  const url = `${BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=100&newsCount=0&listsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`;
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);

  const body = (await res.json()) as { quotes?: RawQuote[] };
  const results = (body.quotes ?? [])
    .filter((item) => {
      const symbol = String(item['symbol'] ?? "");
      return item['quoteType'] === "EQUITY" && /\.(NS|BO)$/i.test(symbol);
    })
    .map((item) => {
      const symbol = String(item['symbol']);
      return {
        symbol,
        ticker: stripSuffix(symbol),
        name: String(item['longname'] ?? item['shortname'] ?? symbol),
        exchange: exchangeOf(symbol),
      };
    });

  const q = query.trim().toLowerCase();
  return results
    .sort((a, b) => {
      const rank = (item: SearchResult) => {
        const ticker = item.ticker.toLowerCase();
        const name = item.name.toLowerCase();
        return (ticker === q ? 100 : 0) +
          (name === q ? 95 : 0) +
          (ticker.startsWith(q) ? 60 : 0) +
          (name.startsWith(q) ? 55 : 0) +
          (name.includes(q) ? 40 : 0) +
          (ticker.includes(q) ? 35 : 0);
      };
      return rank(b) - rank(a);
    })
    .slice(0, 50);
}

async function chartQuote(symbol: string): Promise<Quote | null> {
  const url = `${CHART_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=5d&includePrePost=false`;
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!res.ok) return null;
  const body = (await res.json()) as { chart?: { error?: { description?: string } | null; result?: { meta?: RawQuote }[] } };
  const meta = body.chart?.result?.[0]?.meta;
  return meta ? chartMetaToQuote(meta) : null;
}

/** Latest available quotes for one or more symbols, with chart fallback. */
export async function providerQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];

  try {
    const request = async (retry: boolean): Promise<Response> => {
      const { cookie, crumb } = await getSession(retry);
      const url = `${BASE}/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}&crumb=${encodeURIComponent(crumb)}`;
      return fetch(url, { headers: { "user-agent": UA, cookie, accept: "application/json" } });
    };

    let res = await request(false);
    if (res.status === 401 || res.status === 403) res = await request(true);
    if (!res.ok) throw new Error(`Quote fetch failed (${res.status})`);

    const body = (await res.json()) as { quoteResponse?: { result?: RawQuote[] } };
    const quotes = (body.quoteResponse?.result ?? []).map(toQuote);
    if (quotes.length === symbols.length) return quotes;

    const missing = new Set(symbols.filter((symbol) => !quotes.some((quote) => quote.symbol === symbol)));
    const fallbacks = await Promise.all([...missing].map(chartQuote));
    return [...quotes, ...fallbacks.filter((quote): quote is Quote => Boolean(quote))];
  } catch {
    const fallbacks = await Promise.all(symbols.map(chartQuote));
    const usable = fallbacks.filter((quote): quote is Quote => Boolean(quote));
    if (usable.length > 0) return usable;
    throw new Error("Quote provider unavailable and chart fallback returned no data.");
  }
}

/** Historical OHLCV candles used by the technical analysis engine. */
export async function providerHistory(
  symbol: string,
  interval: Interval = "1d",
  range: Range = "1y",
): Promise<Candle[]> {
  const url = `${CHART_BASE}/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false`;
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!res.ok) throw new Error(`History fetch failed (${res.status})`);

  const body = (await res.json()) as {
    chart?: {
      error?: { description?: string } | null;
      result?: {
        timestamp?: number[];
        indicators?: {
          quote?: {
            open?: (number | null)[];
            high?: (number | null)[];
            low?: (number | null)[];
            close?: (number | null)[];
            volume?: (number | null)[];
          }[];
        };
      }[];
    };
  };

  if (body.chart?.error) {
    throw new Error(body.chart.error.description ?? "History provider error");
  }

  const result = body.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  if (!quote || timestamps.length === 0) return [];

  const candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    const volume = quote.volume?.[i];
    const time = timestamps[i];
    if (
      time === undefined ||
      typeof open !== "number" ||
      typeof high !== "number" ||
      typeof low !== "number" ||
      typeof close !== "number"
    ) {
      continue;
    }
    candles.push({
      time: time * 1000,
      open,
      high,
      low,
      close,
      volume: typeof volume === "number" ? volume : 0,
    });
  }
  return candles;
}
