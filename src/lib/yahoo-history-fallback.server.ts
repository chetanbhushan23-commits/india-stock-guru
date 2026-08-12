import type { Candle, Interval, Range } from "./technical-types";
import { exchangeOf } from "./market-types";

const YAHOO_CHART_HOSTS = [
  "https://query1.finance.yahoo.com/v8/finance/chart",
  "https://query2.finance.yahoo.com/v8/finance/chart",
];
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0 Safari/537.36";

function yahooSymbol(symbol: string): string {
  const value = symbol.trim().toUpperCase();
  if (/\.(NS|BO)$/.test(value)) return value;
  return `${value}.${exchangeOf(value) === "BSE" ? "BO" : "NS"}`;
}

function fallbackRange(interval: Interval, requested: Range): Range {
  if (interval === "1d") {
    return requested === "1mo" || requested === "3mo" ? "1y" : requested;
  }
  if (interval === "1wk") return requested === "1mo" || requested === "3mo" ? "2y" : requested;
  return requested === "1mo" || requested === "3mo" || requested === "6mo" ? "5y" : requested;
}

export async function fetchYahooHistoryFallback(
  symbol: string,
  interval: Interval,
  range: Range,
): Promise<Candle[]> {
  const ticker = yahooSymbol(symbol);
  const effectiveRange = fallbackRange(interval, range);
  const urlSuffix = `?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(effectiveRange)}&includePrePost=false&events=history`;

  for (const host of YAHOO_CHART_HOSTS) {
    try {
      const response = await fetch(`${host}/${encodeURIComponent(ticker)}${urlSuffix}`, {
        headers: { "user-agent": USER_AGENT, accept: "application/json" },
      });
      if (!response.ok) continue;
      const body = (await response.json()) as {
        chart?: {
          error?: { description?: string } | null;
          result?: Array<{
            timestamp?: number[];
            indicators?: {
              quote?: Array<{
                open?: (number | null)[];
                high?: (number | null)[];
                low?: (number | null)[];
                close?: (number | null)[];
                volume?: (number | null)[];
              }>;
            };
          }>;
        };
      };
      if (body.chart?.error) continue;
      const result = body.chart?.result?.[0];
      const timestamps = result?.timestamp ?? [];
      const quote = result?.indicators?.quote?.[0];
      if (!quote) continue;

      const candles: Candle[] = [];
      for (let i = 0; i < timestamps.length; i += 1) {
        const time = Number(timestamps[i]) * 1000;
        const open = Number(quote.open?.[i]);
        const high = Number(quote.high?.[i]);
        const low = Number(quote.low?.[i]);
        const close = Number(quote.close?.[i]);
        const volume = Number(quote.volume?.[i] ?? 0);
        if (!Number.isFinite(time) || ![open, high, low, close].every(Number.isFinite)) continue;
        candles.push({
          time,
          open,
          high,
          low,
          close,
          volume: Number.isFinite(volume) ? volume : 0,
        });
      }
      if (candles.length >= 30) return candles;
    } catch {
      // Try the second Yahoo chart host before giving up.
    }
  }

  return [];
}
