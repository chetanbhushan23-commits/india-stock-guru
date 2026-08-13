import { useEffect, useMemo, useState } from "react";
import { Brain, ExternalLink, Loader2 } from "lucide-react";
import { askAI } from "@/lib/ai.functions";
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
  { label: "5Y", interval: "1mo", range: "5y", description: "Monthly candles · last 5 years" },
  { label: "10Y", interval: "1mo", range: "10y", description: "Monthly candles · last 10 years" },
  { label: "All", interval: "1mo", range: "max", description: "Monthly candles · all available history" },
];

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
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    gain += Math.max(change, 0);
    loss += Math.max(-change, 0);
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
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
  if (["1m", "5m", "15m", "1h"].includes(interval)) {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

function CandleBody({ x, yOpen, yClose, yHigh, yLow, width, bullish }: { x: number; yOpen: number; yClose: number; yHigh: number; yLow: number; width: number; bullish: boolean }) {
  const top = Math.min(yOpen, yClose);
  const height = Math.max(1.5, Math.abs(yClose - yOpen));
  const stroke = bullish ? "#22c55e" : "#ef4444";
  return <g><line x1={x + width / 2} x2={x + width / 2} y1={yHigh} y2={yLow} stroke={stroke} strokeWidth={1.2} /><rect x={x} y={top} width={width} height={height} rx={0.8} fill={stroke} /></g>;
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
  const [chartReading, setChartReading] = useState(false);
  const [chartRead, setChartRead] = useState("");
  const [chartReadError, setChartReadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedCandle(null);
    setChartRead("");
    setChartReadError("");
    getHistory({ data: { symbol, interval: timeframe.interval, range: timeframe.range } })
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setCandles([]);
          setError(result.error.message);
          return;
        }
        setCandles(result.candles);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Unable to load chart data."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [symbol, timeframe]);

  const visible = useMemo(() => candles.length > 180 ? candles.slice(-180) : candles, [candles]);
  const closes = visible.map((c) => c.close);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const sma200 = ema(closes, 200);
  const rsi14 = rsi(closes, 14);
  const vwap = useMemo(() => {
    let pv = 0;
    let vol = 0;
    return visible.map((c) => {
      const typical = (c.high + c.low + c.close) / 3;
      pv += typical * c.volume;
      vol += c.volume;
      return vol ? pv / vol : null;
    });
  }, [visible]);

  const latest = candles.at(-1);
  const first = candles[0];
  const change = latest && first && first.close ? ((latest.close - first.close) / first.close) * 100 : null;
  const latestEma20 = ema20.at(-1);
  const latestEma50 = ema50.at(-1);
  const latestSma200 = sma200.at(-1);
  const latestVwap = vwap.at(-1);
  const latestRsi = rsi14.at(-1);
  const tradingViewSymbol = `${exchange}:${ticker}`;
  const tradingViewUrl = `https://www.tradingview.com/symbols/${encodeURIComponent(exchange)}-${encodeURIComponent(ticker)}/`;

  const priceValues = visible.flatMap((c) => [c.low, c.high]);
  const indicatorValues = [...ema20, ...ema50, ...sma200, ...vwap].filter((v): v is number => v !== null);
  const priceMin = visible.length ? Math.min(...priceValues, ...indicatorValues) : 0;
  const priceMax = visible.length ? Math.max(...priceValues, ...indicatorValues) : 1;
  const padding = (priceMax - priceMin) * 0.08 || 1;
  const min = priceMin - padding;
  const max = priceMax + padding;
  const W = 1200;
  const H = showRsi ? 540 : 490;
  const top = 18;
  const bottom = showRsi ? 120 : 70;
  const left = 70;
  const right = 18;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const y = (value: number) => top + ((max - value) / (max - min)) * plotH;
  const step = visible.length ? plotW / visible.length : plotW;
  const bodyWidth = Math.max(2, Math.min(10, step * 0.62));
  const linePoints = (series: (number | null)[]) => series.map((v, i) => v === null ? "" : `${left + i * step + step / 2},${y(v)}`).filter(Boolean).join(" ");
  const volumeMax = visible.length ? Math.max(...visible.map((c) => c.volume), 1) : 1;
  const ticks = [0, .25, .5, .75, 1].map((p) => ({ p, value: max - (max - min) * p }));

  async function readChart() {
    if (!candles.length || chartReading) return;
    setChartReading(true);
    setChartRead("");
    setChartReadError("");
    const latestCandle = candles.at(-1);
    const question = `Read the current ${tradingViewSymbol} ${timeframe.label} TradingView-style chart for the selected ${timeframe.description}. Use the supplied OHLCV and indicators only. Latest candle: O ${latestCandle?.open.toFixed(2) ?? "NA"}, H ${latestCandle?.high.toFixed(2) ?? "NA"}, L ${latestCandle?.low.toFixed(2) ?? "NA"}, C ${latestCandle?.close.toFixed(2) ?? "NA"}. 20 EMA ${latestEma20?.toFixed(2) ?? "NA"}; 50 EMA ${latestEma50?.toFixed(2) ?? "NA"}; 200 trend ${latestSma200?.toFixed(2) ?? "NA"}; VWAP ${latestVwap?.toFixed(2) ?? "NA"}; RSI 14 ${latestRsi?.toFixed(1) ?? "NA"}. Give a concise English + Hindi reading with trend, momentum, support/resistance context, confirmation and invalidation. Do not claim to see chart pixels or drawings that are not supplied.`;
    try {
      const result = await askAI({ data: { question, symbols: [symbol] } });
      if (result.ok) setChartRead(result.data.summary || "Insufficient verified evidence for a chart reading.");
      else setChartReadError(result.error.message);
    } catch (e) {
      setChartReadError(e instanceof Error ? e.message : "Unable to read the chart.");
    } finally {
      setChartReading(false);
    }
  }

  return <section className="panel p-4 sm:p-5" aria-label={`${ticker} candlestick chart`}>
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2"><h2 className="truncate text-lg font-bold sm:text-xl">{ticker}</h2><span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{exchange}</span><span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">TradingView-style</span></div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{timeframe.description}</p>
        {latest && <p className="mt-0.5 text-[10px] text-muted-foreground">Latest data: {new Date(latest.time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>}
      </div>
      <div className="shrink-0 text-right"><p className="num text-lg font-bold sm:text-2xl">{num(quote?.price ?? latest?.close ?? null)}</p><Delta change={quote?.change ?? null} changePercent={quote?.changePercent ?? change} /></div>
    </header>

    <div className="mt-4 flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface-2/40 p-1.5">
      {TIMEFRAMES.map((item) => <button key={item.label} type="button" onClick={() => setTimeframe(item)} className={cn("rounded-lg px-3 py-1.5 text-xs font-bold transition-colors", timeframe.label === item.label ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground")}>{item.label}</button>)}
      <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
      <button type="button" onClick={() => void readChart()} disabled={chartReading || loading || !candles.length} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"><Brain className="h-3.5 w-3.5" />{chartReading ? "Reading chart…" : "AI Read Chart"}</button>
      <a href={tradingViewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" />TradingView</a>
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
      <span className="text-rose-500">RSI {latestRsi == null ? "—" : latestRsi.toFixed(1)}</span>
    </div>

    {chartRead && <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm leading-6 whitespace-pre-wrap"><div className="mb-1 flex items-center gap-2 text-xs font-bold text-primary"><Brain className="h-3.5 w-3.5" />AI Chart Reading · {timeframe.label}</div>{chartRead}</div>}
    {chartReadError && <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{chartReadError}</div>}

    <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-background/60">
      {loading ? <div className="flex h-[420px] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading {timeframe.label} chart history…</div> : error ? <div className="flex h-[420px] items-center justify-center px-4 text-center text-sm text-muted-foreground">{error}</div> : !visible.length ? <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">No historical data available for this range.</div> : <svg viewBox={`0 0 ${W} ${H}`} className="h-auto min-w-[760px] w-full" role="img" aria-label={`${ticker} ${timeframe.label} candlestick chart`}>
        {ticks.map(({ p, value }) => <g key={p}><line x1={left} x2={W - right} y1={top + p * plotH} y2={top + p * plotH} stroke="currentColor" opacity="0.08" /><text x={left - 8} y={top + p * plotH + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity="0.55">{value.toFixed(2)}</text></g>)}
        {visible.map((c, i) => { const x = left + i * step + (step - bodyWidth) / 2; const bullish = c.close >= c.open; const volH = (c.volume / volumeMax) * 46; return <g key={`${c.time}-${i}`} onClick={() => setSelectedCandle(c)} className="cursor-crosshair"><CandleBody x={x} yOpen={y(c.open)} yClose={y(c.close)} yHigh={y(c.high)} yLow={y(c.low)} width={bodyWidth} bullish={bullish} /><rect x={x} y={H - 52 - volH} width={bodyWidth} height={volH} fill={bullish ? "#22c55e" : "#ef4444"} opacity="0.18" /></g>; })}
        {showEma20 && <polyline points={linePoints(ema20)} fill="none" stroke="#f59e0b" strokeWidth="2" />}
        {showEma50 && <polyline points={linePoints(ema50)} fill="none" stroke="#3b82f6" strokeWidth="2" />}
        {showSma200 && <polyline points={linePoints(sma200)} fill="none" stroke="#a855f7" strokeWidth="2" />}
        {showVwap && <polyline points={linePoints(vwap)} fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="5 4" />}
        <line x1={left} x2={W - right} y1={H - 52} y2={H - 52} stroke="currentColor" opacity="0.1" />
        {[0, .25, .5, .75, 1].map((p) => { const idx = Math.min(visible.length - 1, Math.floor((visible.length - 1) * p)); const c = visible[idx]; return <text key={p} x={left + idx * step + step / 2} y={H - 10} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.55">{dateLabel(c.time, timeframe.interval)}</text>; })}
        {showRsi && <g><text x={left} y={H - 88} fontSize="11" fill="currentColor" opacity="0.65">RSI 14</text>{rsi14.map((v, i) => v == null ? null : <circle key={i} cx={left + i * step + step / 2} cy={H - 112 + (70 - v) * 0.45} r="1.3" fill="#f43f5e" />)}</g>}
      </svg>}
    </div>

    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
      <span>{candles.length.toLocaleString("en-IN")} candles loaded · {timeframe.description}</span>
      {latest && <span>Latest: {new Date(latest.time).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>}
    </div>
  </section>;
}
