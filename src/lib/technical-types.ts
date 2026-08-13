/** Technical analysis DTOs shared by the chart and analysis engines. */

export type Interval = "1m" | "5m" | "15m" | "1h" | "1d" | "1wk" | "1mo";
export type Range = "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "10y" | "max";

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Trend = "uptrend" | "downtrend" | "sideways";
export type Bias = "bullish" | "bearish" | "neutral";
export type MovingAverages = { ema: Record<number, number | null>; sma: Record<number, number | null> };
export type MacdResult = { macd: number | null; signal: number | null; histogram: number | null };
export type BollingerBands = { upper: number | null; middle: number | null; lower: number | null; bandwidth: number | null; percentB: number | null };
export type SupertrendResult = { value: number | null; direction: "bullish" | "bearish" | null };
export type AdxResult = { adx: number | null; plusDi: number | null; minusDi: number | null };
export type FibonacciLevels = { high: number; low: number; direction: "up" | "down"; levels: { ratio: number; label: string; price: number }[] };
export type PivotPoints = { pivot: number; r1: number; r2: number; r3: number; s1: number; s2: number; s3: number };
export type SupportResistance = { support: number[]; resistance: number[] };
export type TrendDetection = { trend: Trend; bias: Bias; strength: number; reasons: string[] };
export type TechnicalIndicators = { movingAverages: MovingAverages; rsi: number | null; macd: MacdResult; bollingerBands: BollingerBands; vwap: number | null; atr: number | null; adx: AdxResult; supertrend: SupertrendResult; fibonacci: FibonacciLevels | null; pivotPoints: PivotPoints | null; supportResistance: SupportResistance; trend: TrendDetection };
export type TechnicalAnalysis = { symbol: string; interval: Interval; range: Range; asOf: number; candleCount: number; lastClose: number; indicators: TechnicalIndicators };
export type TechnicalAnalysisErrorCode = "NO_HISTORY" | "INSUFFICIENT_HISTORY" | "PROVIDER_ERROR";
export type TechnicalAnalysisError = { code: TechnicalAnalysisErrorCode; message: string; symbol: string };
export type TechnicalAnalysisResult = { ok: true; data: TechnicalAnalysis } | { ok: false; error: TechnicalAnalysisError };
export const MIN_CANDLES = 30;
export const MA_PERIODS = [20, 50, 100, 200] as const;
