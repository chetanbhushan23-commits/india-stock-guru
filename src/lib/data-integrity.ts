export type DataQualityStatus = "verified" | "stale" | "conflict" | "missing" | "invalid";

export interface DataQualityMeta {
  status: DataQualityStatus;
  source?: string;
  exchange?: "NSE" | "BSE";
  observedAt?: string;
  message?: string;
}

export interface OhlcvBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function validateOhlcvBar(bar: OhlcvBar): DataQualityMeta {
  const values = [bar.open, bar.high, bar.low, bar.close, bar.volume];
  if (!bar.timestamp || values.some((value) => !Number.isFinite(value))) {
    return { status: "invalid", message: "OHLCV contains missing or non-finite values." };
  }
  if (bar.open < 0 || bar.high < 0 || bar.low < 0 || bar.close < 0 || bar.volume < 0) {
    return { status: "invalid", message: "OHLCV cannot contain negative values." };
  }
  if (bar.high < Math.max(bar.open, bar.close) || bar.low > Math.min(bar.open, bar.close) || bar.high < bar.low) {
    return { status: "invalid", message: "OHLC relationships are inconsistent." };
  }
  return { status: "verified" };
}

export function normalizeExchangeSymbol(symbol: string): { symbol: string; exchange?: "NSE" | "BSE" } {
  const value = symbol.trim().toUpperCase();
  if (value.endsWith(".NS")) return { symbol: value.slice(0, -3), exchange: "NSE" };
  if (value.endsWith(".BO")) return { symbol: value.slice(0, -3), exchange: "BSE" };
  return { symbol: value };
}

export function isFresh(observedAt: string | undefined, maxAgeMs: number, now = Date.now()): boolean {
  if (!observedAt) return false;
  const timestamp = Date.parse(observedAt);
  if (!Number.isFinite(timestamp)) return false;
  return now - timestamp >= 0 && now - timestamp <= maxAgeMs;
}
