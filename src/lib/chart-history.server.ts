import type { Candle, Interval, Range } from "./technical-types";

const BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const intervalRange: Record<Interval, Range> = {
  "1m": "5d",
  "5m": "1mo",
  "15m": "1mo",
  "1h": "6mo",
  "1d": "1y",
  "1wk": "5y",
  "1mo": "max",
};

function toYahooRange(interval: Interval, requested: Range): Range {
  // Yahoo imposes shorter retention windows on intraday candles. Never ask
  // the provider for an invalid combination; use the safest supported range.
  const safe = intervalRange[interval];
  if (["1m", "5m", "15m", "1h"].includes(interval)) return safe;
  return requested;
}

export async function providerChartHistory(symbol: string, interval: Interval, requestedRange: Range): Promise<Candle[]> {
  const range = toYahooRange(interval, requestedRange);
  const url = `${BASE}/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}&includePrePost=false&events=div%2Csplits`;
  const res = await fetch(url, { headers: { accept: "application/json", "user-agent": "Mozilla/5.0 ChetanMarkets-AI" } });
  if (!res.ok) throw new Error(`Chart history provider failed (${res.status})`);
  const body = await res.json() as {
    chart?: { error?: { description?: string } | null; result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ open?: Array<number|null>; high?: Array<number|null>; low?: Array<number|null>; close?: Array<number|null>; volume?: Array<number|null> }> } }> };
  };
  if (body.chart?.error) throw new Error(body.chart.error.description ?? "Chart history provider error");
  const result = body.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  if (!quote) return [];
  return timestamps.flatMap((time, i) => {
    const open = quote.open?.[i], high = quote.high?.[i], low = quote.low?.[i], close = quote.close?.[i], volume = quote.volume?.[i] ?? 0;
    if (![open, high, low, close].every((v) => typeof v === "number" && Number.isFinite(v))) return [];
    return [{ time: time * 1000, open: open as number, high: high as number, low: low as number, close: close as number, volume: typeof volume === "number" && Number.isFinite(volume) ? volume : 0 }];
  });
}
