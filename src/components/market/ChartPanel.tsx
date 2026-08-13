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

function sma(values: number[], index: number, period: number) {
  if (index < period - 1) return null;
  return values.slice(index - period + 1, index + 1).reduce((a, b) => a + b, 0) / period;
}
function dateLabel(time: number, interval: Interval) {
  const d = new Date(time);
  return interval === "1m" || interval === "5m" || interval === "15m" || interval === "1h"
    ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}
function CandleBody({ x, yOpen, yClose, yHigh, yLow, width, bullish }: { x: number; yOpen: number; yClose: number; yHigh: number; yLow: number; width: number; bullish: boolean }) {
  const top = Math.min(yOpen, yClose), height = Math.max(1.5, Math.abs(yClose - yOpen));
  return <g>
    <line x1={x + width / 2} x2={x + width / 2} y1={yHigh} y2={yLow} stroke={bullish ? "#22c55e" : "#ef4444"} strokeWidth={1.2} />
    <rect x={x} y={top} width={width} height={height} rx={0.8} fill={bullish ? "#22c55e" : "#ef4444"} />
  </g>;
}

export function ChartPanel({ quote, symbol, isLoading }: { quote: Quote | null | undefined; symbol: string; isLoading?: boolean; linkToDetails?: boolean }) {
  const ticker = quote?.ticker ?? stripSuffix(symbol);
  const exchange = quote?.exchange ?? (symbol.endsWith(".BO") ? "BSE" : "NSE");
  const [timeframe, setTimeframe] = useState<Timeframe>(TIMEFRAMES[4]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandle, setSelectedCandle] = useState<Candle | null>(null);
  const [showSma20, setShowSma20] = useState(true);

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

  const visible = useMemo(() => candles.length > 140 ? candles.slice(-140) : candles, [candles]);
  const closes = visible.map((c) => c.close);
  const latest = candles.at(-1);
  const first = candles[0];
  const change = latest && first && first.close ? ((latest.close - first.close) / first.close) * 100 : null;
  const priceMin = visible.length ? Math.min(...visible.map((c) => c.low)) : 0;
  const priceMax = visible.length ? Math.max(...visible.map((c) => c.high)) : 1;
  const padding = (priceMax - priceMin) * 0.08 || 1;
  const min = priceMin - padding, max = priceMax + padding;
  const W = 1200, H = 430, top = 18, bottom = 48, left = 64, right = 18;
  const plotW = W - left - right, plotH = H - top - bottom;
  const y = (value: number) => top + ((max - value) / (max - min)) * plotH;
  const step = visible.length ? plotW / visible.length : plotW;
  const bodyWidth = Math.max(2, Math.min(10, step * 0.62));
  const sma20 = visible.map((_, i) => sma(closes, i, 20));
  const smaPath = sma20.map((v, i) => v === null ? "" : `${left + i * step + step / 2},${y(v)}`).filter(Boolean).join(" ");
  const volumeMax = visible.length ? Math.max(...visible.map((c) => c.volume), 1) : 1;
  const ticks = [0, .25, .5, .75, 1].map((p) => ({ p, value: max - (max - min) * p }));

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
      <button type="button" onClick={() => setShowSma20((v) => !v)} className={cn("rounded-md border px-2 py-1", showSma20 ? "border-primary/50 text-foreground" : "border-border")}>SMA 20</button>
      {selectedCandle && <span className="ml-auto num">O {selectedCandle.open.toFixed(2)} · H {selectedCandle.high.toFixed(2)} · L {selectedCandle.low.toFixed(2)} · C {selectedCandle.close.toFixed(2)} · V {selectedCandle.volume.toLocaleString("en-IN")}</span>}
    </div>

    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface-2/30 p-1 sm:p-2">
      {loading ? <div className="grid h-64 place-items-center text-sm text-muted-foreground">Loading {timeframe.label} candles…</div> : error ? <div className="grid h-64 place-items-center px-6 text-center"><div><p className="font-semibold">Candlestick data unavailable</p><p className="mt-1 text-xs text-muted-foreground">{error}</p></div></div> : !visible.length ? <div className="grid h-64 place-items-center text-sm text-muted-foreground">No candle history available.</div> : <svg viewBox={`0 0 ${W} ${H}`} className="h-auto min-h-[250px] w-full select-none" role="img" aria-label={`${ticker} ${timeframe.label} candlestick chart`}>
        {ticks.map(({ p, value }) => <g key={p}><line x1={left} x2={W - right} y1={top + p * plotH} y2={top + p * plotH} stroke="currentColor" opacity=".10" strokeDasharray="4 5" /><text x={left - 8} y={top + p * plotH + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity=".65">₹{value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</text></g>)}
        {visible.map((c, i) => {
          const x = left + i * step + (step - bodyWidth) / 2;
          const bullish = c.close >= c.open;
          return <g key={c.time} onMouseEnter={() => setSelectedCandle(c)} onClick={() => setSelectedCandle(c)} className="cursor-crosshair"><CandleBody x={x} yOpen={y(c.open)} yClose={y(c.close)} yHigh={y(c.high)} yLow={y(c.low)} width={bodyWidth} bullish={bullish} /><rect x={x} y={H - 38 - (c.volume / volumeMax) * 35} width={bodyWidth} height={(c.volume / volumeMax) * 35} fill={bullish ? "#22c55e" : "#ef4444"} opacity=".16" /></g>;
        })}
        {showSma20 && smaPath && <polyline points={smaPath} fill="none" stroke="#f59e0b" strokeWidth="2" opacity=".9" />}
        {visible.filter((_, i) => i === 0 || i === visible.length - 1 || i % Math.max(1, Math.floor(visible.length / 5)) === 0).map((c) => { const i = visible.indexOf(c); return <text key={c.time} x={left + i * step + step / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="currentColor" opacity=".65">{dateLabel(c.time, timeframe.interval)}</text>; })}
      </svg>}
    </div>
    <p className="mt-2 text-[11px] text-muted-foreground">OHLCV candles from the market-data provider. Intraday retention depends on provider availability; no synthetic candles are generated.</p>
  </section>;
}
