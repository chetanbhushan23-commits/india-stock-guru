/** Server function layer for historical OHLCV and technical analysis. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { analyzeCandles } from "./technical-analysis";
import type { Candle, Interval, Range, TechnicalAnalysisResult } from "./technical-types";

const analysisInput = z.object({
  symbol: z.string().trim().min(1).max(24),
  interval: z.enum(["1m", "5m", "15m", "1h", "1d", "1wk", "1mo"]).default("1d"),
  range: z.enum(["5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "max"]).default("1y"),
});

export type TechnicalAnalysisInput = z.infer<typeof analysisInput>;
export type HistoryResult = { ok: true; candles: Candle[] } | { ok: false; error: { code: "NO_HISTORY" | "PROVIDER_ERROR"; message: string; symbol: string } };

export const getHistory = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => analysisInput.parse(data))
  .handler(async ({ data }): Promise<HistoryResult> => {
    const { providerHistory } = await import("./market-data.server");
    try {
      const candles = await providerHistory(data.symbol, data.interval as Interval, data.range as Range);
      if (!candles.length) return { ok: false, error: { code: "NO_HISTORY", symbol: data.symbol, message: `No historical candles available for ${data.symbol}.` } };
      return { ok: true, candles };
    } catch (error) {
      return { ok: false, error: { code: "PROVIDER_ERROR", symbol: data.symbol, message: error instanceof Error ? error.message : "Historical data provider failed." } };
    }
  });

export const getTechnicalAnalysis = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => analysisInput.parse(data))
  .handler(async ({ data }): Promise<TechnicalAnalysisResult> => {
    const { providerHistory } = await import("./market-data.server");
    let candles: Candle[];
    try { candles = await providerHistory(data.symbol, data.interval as Interval, data.range as Range); }
    catch (error) { return { ok: false, error: { code: "PROVIDER_ERROR", symbol: data.symbol, message: error instanceof Error ? error.message : "Historical data provider failed." } }; }
    return analyzeCandles(data.symbol, candles, data.interval as Interval, data.range as Range);
  });
