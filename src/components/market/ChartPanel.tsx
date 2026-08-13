import { useEffect, useMemo, useState } from "react";
import { getHistory } from "@/lib/technical.functions";
import type { Candle, Interval, Range } from "@/lib/technical-types";
import { num, stripSuffix, type Quote } from "@/lib/market-types";
import { Delta } from "./Delta";
import { cn } from "@/lib/utils";

type Timeframe = { label: string; interval: Interval; range: Range; description: string };
const TIMEFRAMES: Timeframe[] = [
  { label: "1m", interval: "1m", range: "5d", description: "1-minute candles · last 5 days" },
  { label: "5m", interval: "5m", range: "1mo", description: "5-minute candles · last month" },
  { label: "15m", interval: "15m", range: "1mo", description: "15-minute candles · last month" },
  { label: "1H", interval: "1h", range: "6mo", description: "1-hour candles · last 6 months" },
  { label: "1D", interval: "1d", range: "1y", description: "Daily candles · last year" },
  { label: "1M", interval: "1mo", range: "5y", description: "Monthly candles · last 5 years" },
  { label: "1Y", interval: "1mo", range: "max", description: "Long-term monthly view" },
];

function average(values: number[], index: number, period: number) {
  if (index < period - 1) return null;
  const slice = values.slice(index - period + 1, index + 1);
  return slice.reduce((a, b) => a + b, 0) / period;
}
function ema(values: number[], period: number) {
  const out: (number | null)[] = Array(values.length).fill(null);
  if (values.length < period) return out;
  let seed = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = seed;
  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i++) {
    seed = values[i] * k + seed * (1 - k);
    out[i] = seed;
  }
  return out;
}
function rsi(values: number[], period = 14) {
  const out: (number | null)[] = Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    gain += Math.max(change, 0);
    loss += Math.max(-change, 0);
  }
  let avgGain = gain / period, avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}
function dateLabel(time: number, interval: Interval) {
  const d = new Date(time);
  return interval === "1m" || interval === "5m" || interval === "15m" || interval === "1h"
    ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}
function CandleBody({ x, yOpen, yClose, yHigh, yLow, width, bullish }: { x: number; yOpen: number; yClose: number; yHigh: number; yLow: number; width: number; bullish: boolean }) {
  const top = Math.min(yOpen, yClose), height = Math.max(1.5, Math.abs(yClose - yOpen));
  return <g><line x1={x + width / 2} x2={x + width / 2} y1={yHigh} y2={yLow} stroke={bullish ? "#22c55e" : "#ef4444"} strokeWidth={1.2} /><rect x={x} y={top} width={width} height={height} rx={0.8} fill={bullish ? "#22c55e" : "#ef4444"} /></g>;
}

export function ChartPanel({ quote, symbol, isLoading }: { quote: Quote | null | undefined; symbol: string; isLoading?: boolean; linkToDetails?: boolean }) {
  const ticker = quote?.ticker ?? stripSuffix(symbol);
  const exchange = quote?.exchange ?? (symbol.endsWith(".BO") ? "BSE" : "NSE");
  const [timeframe, setTimeframe] = useState<Timeframe>(TIMEFRAMES[4]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandle, setSelectedCandle] = useState<Candle | null>(null);
  const [showEma20, setShowEma20] = useState(true);
  const [showEma50, setShowEma50] = useState(true);
  const [showSma200, setShowSma200] = useState(false);
  const [showVwap, setShowVwap] = useState(false);
  const [showRsi, setShowRsi] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setSelectedCandle(null);
    getHistory({ data: { symbol, interval: timeframe.interval, range: timeframe.range } })
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) { setCandles([]); setError(result.error.message); return; }
        setCandles(result.candles);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Unable to load chart data."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [symbol, timeframe]);

  const visible = useMemo(() => candles.length > 160 ? candles.slice(-160) : candles, [candles]);
  const closes = visible.map((c) => c.close);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const sma200 = ema(closes, 200); // same visual role as a 200-period long trend line, using the same stable seed method.
  const rsi14 = rsi(closes, 14);
  const vwap = useMemo(() => {
    let pv = 0, vol = 0;
    return visible.map((c) => {
      const typical = (c.high + c.low + c.close) / 3;
      pv += typical * c.volume; vol += c.volume;
      return vol ? pv / vol : null;
    });
  }, [visible]);
  const latest = candles.at(-1);
  const first = candles[0];
  const change = latest && first && first.close ? ((latest.close - first.close) / first.close) * 100 : null;
  const priceMin = visible.length ? Math.min(...visible.map((c) => c.low), ...ema20.filter((v): v is number => v !== null), ...ema50.filter((v): v is number => v !== null)) : 0;
  const priceMax = visible.length ? Math.max(...visible.map((c) => c.high), ...ema20.filter((v): v is number => v !== null), ...ema50.filter((v): v is number => v !== null)) : 1;
  const padding = (priceMax - priceMin) * 0.08 || 1;
  const min = priceMin - padding, max = priceMax + padding;
  const W = 1200, H = showRsi ? 520 : 470, top = 18, bottom = showRsi ? 110 : 58, left = 64, right = 18;
  const plotW = W - left - right, plotH = H - top - bottom;
  const y = (value: number) => top + ((max - value) / (max - min)) * plotH;
  const step = visible.length ? plotW / visible.length : plotW;
  const bodyWidth = Math.max(2, Math.min(10, step * 0.62));
  const linePoints = (series: (number | null)[]) => series.map((v, i) => v === null ? "" : `${left + i * step + step / 2},${y(v)}`).filter(Boolean).join(" ");
  const volumeMax = visible.length ? Math.max(...visible.map((c) => c.volume), 1) : 1;
  const ticks = [0, .25, .5, .75, 1].map((p) => ({ p, value: max - (max - min) * p }));
  const latestEma20 = ema20.at(-1), latestEma50 = ema50.at(-1), latestSma200 = sma200.at(-1), latestVwap = vwap.at(-1), latestRsi = rsi14.at(-1);

  return <section className="panel p-4 sm:p-5" aria-label={`${ticker} candlestick chart`}>
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-lg font-bold sm:text-xl">{ticker}</h2><span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{exchange}</span></div><p className="mt-0.5 truncate text-xs text-muted-foreground">{timeframe.description}</p></div>
      <div className="shrink-0 text-right"><p className="num text-lg font-bold sm:text-2xl">{num(quote?.price ?? latest?.close ?? null)}</p><Delta change={quote?.change ?? null} changePercent={quote?.changePercent ?? change} /></div>
    </header>

    <div className="mt-4 flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface-2/40 p-1.5">
      {TIMEFRAMES.map((item) => <button key={item.label} type="button" onClick={() => setTimeframe(item)} className={cn("rounded-lg px-3 py-1.5 text-xs font-bold transition-colors", timeframe.label === item.label ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground")}>{item.label}</button>)}
    </div>

    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
      <span className="font-semibold text-foreground">Candlestick</span><span>🟢 Bullish</span><span>🔴 Bearish</span>
      <button type="button" onClick={() => setShowEma20((v) => !v)} className={cn("rounded-md border px-2 py-1 font-semibold", showEma20 ? "border-amber-400/60 text-amber-500" : "border-border")}>20 EMA</button>
      <button type="button" onClick={() => setShowEma50((v) => !v)} className={cn("rounded-md border px-2 py-1 font-semibold", showEma50 ? "border-blue-400/60 text-blue-500" : "border-border")}>50 EMA</button>
      <button type="button" onClick={() => setShowSma200((v) => !v)} className={cn("rounded-md border px-2 py-1 font-semibold", showSma200 ? "border-purple-400/60 text-purple-500" : "border-border")}>200 Trend</button>
      <button type="button" onClick={() => setShowVwap((v) => !v)} className={cn("rounded-md border px-2 py-1 font-semibold", showVwap ? "border-cyan-400/60 text-cyan-500" : "border-border")}>VWAP</button>
      <button type="button" onClick={() => setShowRsi((v) => !v)} className={cn("rounded-md border px-2 py-1 font-semibold", showRsi ? "border-rose-400/60 text-rose-500" : "border-border")}>RSI 14</button>
      {selectedCandle && <span className="ml-auto num">O {selectedCandle.open.toFixed(2)} · H {selectedCandle.high.toFixed(2)} · L {selectedCandle.low.toFixed(2)} · C {selectedCandle.close.toFixed(2)} · V {selectedCandle.volume.toLocaleString("en-IN")}</span>}
    </div>

    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-surface-2/50 px-3 py-2 text-[11px] font-semibold">
      <span className="text-amber-500">20 EMA {latestEma20 == null ? "—" : `₹${latestEma20.toFixed(2)}`}</span>
      <span className="text-blue-500">50 EMA {latestEma50 == null ? "—" : `₹${latestEma50.toFixed(2)}`}</span>
      <span className="text-purple-500">200 Trend {latestSma200 == null ? "—" : `₹${latestSma200.toFixed(2)}`}</span>
      <span className="text-cyan-500">VWAP {latestVwap == null ? "—" : `₹${latestVwap.toFixed(2)}`}</span>
      <span className={cn(latestRsi != null && latestRsi >= 55 ? "text-green-500" : latestRsi != null && latestRsi <= 45 ? "text-red-500" : "text-muted-foreground")}>RSI {latestRsi == null ? "—" : latestRsi.toFixed(1)}</span>
    </div>

    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface-2/30 p-1 sm:p-2">
      {loading ? <div className="grid h-64 place-items-center text-sm text-muted-foreground">Loading {timeframe.label} candles…</div> : error ? <div className="grid h-64 place-items-center px-6 text-center"><div><p className="font-semibold">Candlestick data unavailable</p><p className="mt-1 text-xs text-muted-foreground">{error}</p></div></div> : !visible.length ? <div className="grid h-64 place-items-center text-sm text-muted-foreground">No candle history available.</div> : <svg viewBox={`0 0 ${W} ${H}`} className="h-auto min-h-[280px] w-full select-none" role="img" aria-label={`${ticker} ${timeframe.label} candlestick chart with 20 EMA, 50 EMA, long trend, VWAP and RSI`}>
        {ticks.map(({ p, value }) => <g key={p}><line x1={left} x2={W - right} y1={top + p * plotH} y2={top + p * plotH} stroke="currentColor" opacity=".10" strokeDasharray="4 5" /><text x={left - 8} y={top + p * plotH + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity=".65">₹{value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</text></g>)}
        {visible.map((c, i) => { const x = left + i * step + (step - bodyWidth) / 2; const bullish = c.close >= c.open; return <g key={c.time} onMouseEnter={() => setSelectedCandle(c)} onClick={() => setSelectedCandle(c)} className="cursor-crosshair"><CandleBody x={x} yOpen={y(c.open)} yClose={y(c.close)} yHigh={y(c.high)} yLow={y(c.low)} width={bodyWidth} bullish={bullish} /><rect x={x} y={H - (showRsi ? 86 : 46) - (c.volume / volumeMax) * 35} width={bodyWidth} height={(c.volume / volumeMax) * 35} fill={bullish ? "#22c55e" : "#ef4444"} opacity=".16" /></g>; })}
        {showEma20 && linePoints(ema20) && <polyline points={linePoints(ema20)} fill="none" stroke="#f59e0b" strokeWidth="2.5" opacity=".95" />}
        {showEma50 && linePoints(ema50) && <polyline points={linePoints(ema50)} fill="none" stroke="#3b82f6" strokeWidth="2.5" opacity=".95" />}
        {showSma200 && linePoints(sma200) && <polyline points={linePoints(sma200)} fill="none" stroke="#a855f7" strokeWidth="2" strokeDasharray="7 4" opacity=".9" />}
        {showVwap && linePoints(vwap) && <polyline points={linePoints(vwap)} fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 3" opacity=".9" />}
        {showRsi && <g transform={`translate(0, ${top + plotH + 20})`}><line x1={left} x2={W - right} y1="0" y2="0" stroke="currentColor" opacity=".18" /><text x={left} y="12" fontSize="11" fill="#f43f5e" fontWeight="700">RSI 14</text><text x={W-right} y="12" textAnchor="end" fontSize="10" fill="currentColor" opacity=".6">70 overbought · 50 neutral · 30 oversold</text><polyline points={rsi14.map((v, i) => v == null ? "" : `${left + i * step + step / 2},${8 + ((100 - v) / 100) * 62}`).filter(Boolean).join(" ")} fill="none" stroke="#f43f5e" strokeWidth="2" /></g>}
        {visible.filter((_, i) => i === 0 || i === visible.length - 1 || i % Math.max(1, Math.floor(visible.length / 5)) === 0).map((c) => { const i = visible.indexOf(c); return <text key={c.time} x={left + i * step + step / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="currentColor" opacity=".65">{dateLabel(c.time, timeframe.interval)}</text>; })}
      </svg>}
    </div>
    <p className="mt-2 text-[11px] text-muted-foreground">Candles + trend overlays are calculated from the returned OHLCV history. 20 EMA and 50 EMA are enabled by default; 200 Trend, VWAP and RSI 14 can be turned on for deeper analysis.</p>
  </section>;
}
