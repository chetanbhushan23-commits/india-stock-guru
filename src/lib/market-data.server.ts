/* Server-only market data provider for NSE (.NS) and BSE (.BO). Yahoo is primary; Twelve Data is a server-side fallback when TWELVE_DATA_API_KEY is configured. */
import { exchangeOf, stripSuffix, type Quote, type SearchResult } from "./market-types";
import type { Candle, Interval, Range } from "./technical-types";

const BASE = "https://query2.finance.yahoo.com";
const SEARCH_BASE = "https://query1.finance.yahoo.com";
const CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const TWELVE_BASE = "https://api.twelvedata.com";
const TWELVE_DATA_API_KEY = typeof process !== "undefined" ? process.env.TWELVE_DATA_API_KEY : undefined;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0 Safari/537.36";

type Session = { cookie: string; crumb: string; createdAt: number };
type RawQuote = Record<string, unknown>;
let session: Session | null = null;
const nullable = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const twelveExchange = (symbol: string) => exchangeOf(symbol) === "BSE" ? "BSE" : "NSE";
const twelveTicker = (symbol: string) => stripSuffix(symbol).replace(/\.(NS|BO)$/i, "");

async function twelveDataRequest(path: string): Promise<Record<string, unknown> | null> {
  if (!TWELVE_DATA_API_KEY) return null;
  const separator = path.includes("?") ? "&" : "?";
  const res = await fetch(`${TWELVE_BASE}${path}${separator}apikey=${encodeURIComponent(TWELVE_DATA_API_KEY)}`, { headers: { accept: "application/json", "user-agent": UA } });
  if (!res.ok) return null;
  const body = (await res.json()) as Record<string, unknown>;
  return body["status"] === "error" ? null : body;
}

async function twelveQuote(symbol: string): Promise<Quote | null> {
  const body = await twelveDataRequest(`/quote?symbol=${encodeURIComponent(twelveTicker(symbol))}&exchange=${encodeURIComponent(twelveExchange(symbol))}`);
  if (!body) return null;
  const price = Number(body["close"] ?? body["price"]);
  const previousClose = Number(body["previous_close"]);
  if (!Number.isFinite(price)) return null;
  const change = Number.isFinite(previousClose) ? price - previousClose : null;
  return { symbol, ticker: stripSuffix(symbol), name: String(body["name"] ?? stripSuffix(symbol)), exchange: twelveExchange(symbol), currency: "INR", marketState: "CLOSED", price, previousClose: Number.isFinite(previousClose) ? previousClose : null, change, changePercent: Number.isFinite(previousClose) && previousClose !== 0 && change !== null ? (change / previousClose) * 100 : null, open: Number.isFinite(Number(body["open"])) ? Number(body["open"]) : null, dayHigh: Number.isFinite(Number(body["high"])) ? Number(body["high"]) : null, dayLow: Number.isFinite(Number(body["low"])) ? Number(body["low"]) : null, fiftyTwoWeekHigh: null, fiftyTwoWeekLow: null, volume: Number.isFinite(Number(body["volume"])) ? Number(body["volume"]) : null, marketCap: null };
}

async function twelveHistory(symbol: string, interval: Interval, range: Range): Promise<Candle[]> {
  if (!TWELVE_DATA_API_KEY) return [];
  const intervalMap: Record<string, string> = { "1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "1h", "1d": "1day" };
  const outputsize = range === "5d" ? 10 : range === "1mo" ? 35 : range === "3mo" ? 100 : range === "6mo" ? 180 : range === "1y" ? 260 : 2000;
  const body = await twelveDataRequest(`/time_series?symbol=${encodeURIComponent(twelveTicker(symbol))}&exchange=${encodeURIComponent(twelveExchange(symbol))}&interval=${encodeURIComponent(intervalMap[interval] ?? "1day")}&outputsize=${outputsize}&order=ASC`);
  const values = Array.isArray(body?.values) ? body.values as Record<string, unknown>[] : [];
  return values.flatMap((item) => {
    const time = Date.parse(String(item["datetime"] ?? ""));
    const open = Number(item["open"]), high = Number(item["high"]), low = Number(item["low"]), close = Number(item["close"]), volume = Number(item["volume"] ?? 0);
    if (!Number.isFinite(time) || ![open, high, low, close].every(Number.isFinite)) return [];
    return [{ time, open, high, low, close, volume: Number.isFinite(volume) ? volume : 0 }];
  });
}

async function createSession(): Promise<Session> {
  const seed = await fetch("https://fc.yahoo.com", { headers: { "user-agent": UA } });
  const headers = seed.headers as Headers & { getSetCookie?: () => string[] };
  const raw = headers.getSetCookie?.() ?? [seed.headers.get("set-cookie") ?? ""];
  const cookie = raw.filter(Boolean).map((value) => value.split(";")[0]).join("; ");
  const crumbRes = await fetch(`${BASE}/v1/test/getcrumb`, { headers: { "user-agent": UA, cookie } });
  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.includes("<")) throw new Error("Could not authenticate with market data provider");
  return { cookie, crumb, createdAt: Date.now() };
}
async function getSession(refresh = false): Promise<Session> { if (refresh || !session || Date.now() - session.createdAt > 20 * 60_000) session = await createSession(); return session; }
function toQuote(raw: RawQuote): Quote { const symbol = String(raw["symbol"] ?? ""); const price = nullable(raw["regularMarketPrice"]); const previousClose = nullable(raw["regularMarketPreviousClose"]); return { symbol, ticker: stripSuffix(symbol), name: String(raw["longName"] ?? raw["shortName"] ?? symbol), exchange: String(raw["fullExchangeName"] ?? exchangeOf(symbol)), currency: String(raw["currency"] ?? "INR"), marketState: String(raw["marketState"] ?? "CLOSED"), price, previousClose, change: nullable(raw["regularMarketChange"]), changePercent: nullable(raw["regularMarketChangePercent"]), open: nullable(raw["regularMarketOpen"]), dayHigh: nullable(raw["regularMarketDayHigh"]), dayLow: nullable(raw["regularMarketDayLow"]), fiftyTwoWeekHigh: nullable(raw["fiftyTwoWeekHigh"]), fiftyTwoWeekLow: nullable(raw["fiftyTwoWeekLow"]), volume: nullable(raw["regularMarketVolume"]), marketCap: nullable(raw["marketCap"]) }; }
function chartMetaToQuote(meta: RawQuote): Quote { const symbol = String(meta["symbol"] ?? ""); const price = nullable(meta["regularMarketPrice"]); const previousClose = nullable(meta["previousClose"] ?? meta["chartPreviousClose"]); const change = price !== null && previousClose !== null ? price - previousClose : null; return { symbol, ticker: stripSuffix(symbol), name: String(meta["longName"] ?? meta["shortName"] ?? symbol), exchange: String(meta["fullExchangeName"] ?? meta["exchangeName"] ?? exchangeOf(symbol)), currency: String(meta["currency"] ?? "INR"), marketState: String(meta["marketState"] ?? "CLOSED"), price, previousClose, change, changePercent: change !== null && previousClose ? (change / previousClose) * 100 : null, open: nullable(meta["regularMarketOpen"]), dayHigh: nullable(meta["regularMarketDayHigh"]), dayLow: nullable(meta["regularMarketDayLow"]), fiftyTwoWeekHigh: nullable(meta["fiftyTwoWeekHigh"]), fiftyTwoWeekLow: nullable(meta["fiftyTwoWeekLow"]), volume: nullable(meta["regularMarketVolume"]), marketCap: nullable(meta["marketCap"]) }; }
const normalizeSearchText = (value: string) => value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();

async function yahooSearch(query: string): Promise<SearchResult[]> { const responses = await Promise.allSettled([BASE, SEARCH_BASE].map(async (base) => { const url = `${base}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=100&newsCount=0&listsCount=0&enableFuzzyQuery=true`; const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } }); if (!res.ok) return [] as RawQuote[]; return ((await res.json()) as { quotes?: RawQuote[] }).quotes ?? []; })); const raw = responses.flatMap((item) => item.status === "fulfilled" ? item.value : []); const seen = new Set<string>(); return raw.filter((item) => { const symbol = String(item["symbol"] ?? ""); const type = String(item["quoteType"] ?? "").toUpperCase(); if (!/\.(NS|BO)$/i.test(symbol)) return false; if (type && !["EQUITY", "ETF"].includes(type)) return false; const key = symbol.toUpperCase(); if (seen.has(key)) return false; seen.add(key); return true; }).map((item) => { const symbol = String(item["symbol"]); return { symbol, ticker: stripSuffix(symbol), name: String(item["longname"] ?? item["longName"] ?? item["shortname"] ?? item["shortName"] ?? symbol), exchange: exchangeOf(symbol) }; }); }
const COMMON_ALIASES: Record<string, string[]> = { "reliance industries": ["RELIANCE"], reliance: ["RELIANCE"], infosys: ["INFY"], "hdfc bank": ["HDFCBANK"], "icici bank": ["ICICIBANK"], "state bank of india": ["SBIN"], sbi: ["SBIN"], "tata motors": ["TATAMOTORS"], "tata steel": ["TATASTEEL"], "tata consultancy services": ["TCS"], tcs: ["TCS"], itc: ["ITC"], "larsen and toubro": ["LT"], "l&t": ["LT"], "bharti airtel": ["BHARTIARTL"], airtel: ["BHARTIARTL"], "axis bank": ["AXISBANK"], kotak: ["KOTAKBANK"], "kotak mahindra bank": ["KOTAKBANK"], "adani enterprises": ["ADANIENT"], "adani ports": ["ADANIPORTS"], maruti: ["MARUTI"], "maruti suzuki": ["MARUTI"], "sun pharma": ["SUNPHARMA"], lupin: ["LUPIN"], wipro: ["WIPRO"], hcltech: ["HCLTECH"], "hcl technologies": ["HCLTECH"], "bajaj finance": ["BAJFINANCE"], "bajaj finserv": ["BAJAJFINSV"], titan: ["TITAN"], ultratech: ["ULTRACEMCO"], "ultratech cement": ["ULTRACEMCO"] };
async function chartQuote(symbol: string): Promise<Quote | null> { const url = `${CHART_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=5d&includePrePost=false`; const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } }); if (!res.ok) return null; const body = (await res.json()) as { chart?: { result?: { meta?: RawQuote }[] } }; const meta = body.chart?.result?.[0]?.meta; return meta ? chartMetaToQuote(meta) : null; }
async function directSymbolCandidates(query: string): Promise<SearchResult[]> { const normalized = normalizeSearchText(query); const aliases = COMMON_ALIASES[normalized] ?? []; const compact = normalized.replace(/\s+/g, ""); const candidates = [...new Set([...aliases, compact])].filter((symbol) => /^[A-Z0-9&-]{2,20}$/i.test(symbol)); const symbols = candidates.flatMap((ticker) => [`${ticker.toUpperCase()}.NS`, `${ticker.toUpperCase()}.BO`]); const quotes = await Promise.all(symbols.map(chartQuote)); return quotes.filter((quote): quote is Quote => Boolean(quote)).map((quote) => ({ symbol: quote.symbol, ticker: quote.ticker, name: quote.name, exchange: quote.exchange })); }
export async function providerSearch(query: string): Promise<SearchResult[]> { const trimmed = query.trim(); if (!trimmed) return []; const normalized = normalizeSearchText(trimmed); const variants = [...new Set([trimmed, normalized, normalized.replace(/\s+/g, ""), normalized.split(" ").slice(0, 2).join(" ")].filter(Boolean))]; const batches = await Promise.all(variants.map(yahooSearch)); const merged = [...batches.flat(), ...(await directSymbolCandidates(trimmed))]; const q = normalizeSearchText(trimmed); const seen = new Set<string>(); return merged.filter((item) => { const key = item.symbol.toUpperCase(); if (seen.has(key)) return false; seen.add(key); return true; }).sort((a, b) => { const rank = (item: SearchResult) => { const ticker = normalizeSearchText(item.ticker); const name = normalizeSearchText(item.name); const compactQ = q.replace(/\s+/g, ""); return (ticker === compactQ ? 120 : 0) + (name === q ? 115 : 0) + (ticker.startsWith(compactQ) ? 75 : 0) + (name.startsWith(q) ? 70 : 0) + (name.includes(q) ? 55 : 0) + (ticker.includes(compactQ) ? 50 : 0) + (item.exchange === "NSE" ? 3 : 0); }; return rank(b) - rank(a); }).slice(0, 50); }
export async function providerQuotes(symbols: string[]): Promise<Quote[]> { if (!symbols.length) return []; try { const request = async (retry: boolean) => { const { cookie, crumb } = await getSession(retry); return fetch(`${BASE}/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}&crumb=${encodeURIComponent(crumb)}`, { headers: { "user-agent": UA, cookie, accept: "application/json" } }); }; let res = await request(false); if (res.status === 401 || res.status === 403) res = await request(true); if (!res.ok) throw new Error(`Quote fetch failed (${res.status})`); const body = (await res.json()) as { quoteResponse?: { result?: RawQuote[] } }; const quotes = (body.quoteResponse?.result ?? []).map(toQuote); const missing = symbols.filter((symbol) => !quotes.some((quote) => quote.symbol === symbol)); if (!missing.length) return quotes; const fallbacks = await Promise.all(missing.map(async (symbol) => (await chartQuote(symbol)) ?? (await twelveQuote(symbol)))); return [...quotes, ...fallbacks.filter((quote): quote is Quote => Boolean(quote))]; } catch { const fallbacks = await Promise.all(symbols.map(async (symbol) => (await chartQuote(symbol)) ?? (await twelveQuote(symbol)))); const usable = fallbacks.filter((quote): quote is Quote => Boolean(quote)); if (usable.length) return usable; throw new Error("Quote provider unavailable and configured fallbacks returned no data."); } }

export async function providerHistory(symbol: string, interval: Interval = "1d", range: Range = "1y"): Promise<Candle[]> {
  try {
    const url = `${CHART_BASE}/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false`;
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
    if (!res.ok) throw new Error(`History fetch failed (${res.status})`);
    const body = (await res.json()) as { chart?: { error?: { description?: string } | null; result?: { timestamp?: number[]; indicators?: { quote?: { open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }[] } }[] } };
    if (body.chart?.error) throw new Error(body.chart.error.description ?? "History provider error");
    const result = body.chart?.result?.[0]; const timestamps = result?.timestamp ?? []; const quote = result?.indicators?.quote?.[0];
    if (!quote) throw new Error("Yahoo returned no historical candles.");
    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i += 1) { const open = quote.open?.[i], high = quote.high?.[i], low = quote.low?.[i], close = quote.close?.[i], volume = quote.volume?.[i], time = timestamps[i]; if (time === undefined || typeof open !== "number" || typeof high !== "number" || typeof low !== "number" || typeof close !== "number") continue; candles.push({ time: time * 1000, open, high, low, close, volume: typeof volume === "number" ? volume : 0 }); }
    if (candles.length >= 50) return candles;
    const twelve = await twelveHistory(symbol, interval, range); if (twelve.length >= 50) return twelve; return candles.length ? candles : twelve;
  } catch (error) {
    const twelve = await twelveHistory(symbol, interval, range); if (twelve.length) return twelve; throw error;
  }
}
