import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Building2,
  Clock3,
  ExternalLink,
  Newspaper,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { getFundamentals } from "@/lib/fundamental.functions";
import { getNewsFeed } from "@/lib/news.functions";
import { getTechnicalAnalysis } from "@/lib/technical.functions";
import { quoteQuery } from "@/lib/market-queries";
import type { TechnicalAnalysis } from "@/lib/technical-types";
import type { FundamentalAnalysis } from "@/lib/fundamental-types";
import type { NewsFeed } from "@/lib/news-types";

const tabs = [
  ["overview", "Overview"],
  ["price", "Price & Chart"],
  ["technical", "Technical"],
  ["fundamental", "Fundamental"],
  ["news", "Live News"],
  ["events", "Corporate"],
] as const;

type Tab = (typeof tabs)[number][0];

const num = (value: number | null | undefined, digits = 2) =>
  value == null || !Number.isFinite(value) ? "—" : value.toLocaleString("en-IN", { maximumFractionDigits: digits });
const pct = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? "—" : `${value.toFixed(2)}%`;
const age = (epoch: number | string | null | undefined) => {
  if (!epoch) return "Unavailable";
  const time = typeof epoch === "number" ? epoch : Date.parse(epoch);
  if (!Number.isFinite(time)) return "Unavailable";
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
};

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function State({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${ok ? "bg-bull/10 text-bull" : "bg-muted/60 text-muted-foreground"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-bull" : "bg-muted-foreground"}`} />
      {label}
    </span>
  );
}

function TechnicalView({ data }: { data: TechnicalAnalysis | null }) {
  if (!data) return <Empty text="Technical analysis is unavailable for this symbol." />;
  const i = data.indicators;
  const trend = i.trend;
  const trendUp = trend.bias === "bullish";
  const trendDown = trend.bias === "bearish";
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Trend" value={trend.trend.toUpperCase()} hint={`${trend.bias} · ${trend.strength}/100`} />
        <Metric label="RSI" value={num(i.rsi)} hint="14-period" />
        <Metric label="ADX" value={num(i.adx.adx)} hint={`+DI ${num(i.adx.plusDi)} · -DI ${num(i.adx.minusDi)}`} />
        <Metric label="ATR" value={num(i.atr)} hint="Daily volatility" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="EMA 20" value={num(i.movingAverages.ema[20])} hint={`Price ${num(data.lastClose)}`} />
        <Metric label="EMA 50" value={num(i.movingAverages.ema[50])} />
        <Metric label="EMA 200" value={num(i.movingAverages.ema[200])} />
        <Metric label="MACD" value={num(i.macd.macd)} hint={`Signal ${num(i.macd.signal)}`} />
        <Metric label="MACD Histogram" value={num(i.macd.histogram)} />
        <Metric label="VWAP" value={num(i.vwap)} />
      </div>
      <div className="flex flex-wrap gap-2 rounded-xl border border-border/70 bg-background/40 p-3 text-xs">
        {trendUp ? <TrendingUp className="h-4 w-4 text-bull" /> : trendDown ? <TrendingDown className="h-4 w-4 text-bear" /> : <Activity className="h-4 w-4 text-muted-foreground" />}
        <span className="font-semibold">{trend.trend}</span>
        <span className="text-muted-foreground">{trend.reasons.join(" · ") || "No directional reason supplied."}</span>
      </div>
    </div>
  );
}

function FundamentalView({ data }: { data: FundamentalAnalysis | null }) {
  if (!data) return <Empty text="Fundamental data is unavailable for this symbol." />;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="P/E" value={num(data.valuation.peRatioTTM)} hint="TTM" />
        <Metric label="P/B" value={num(data.valuation.pbRatio)} />
        <Metric label="ROE" value={pct(data.profitability.roe)} />
        <Metric label="ROCE" value={pct(data.profitability.roce)} />
        <Metric label="Debt / Equity" value={num(data.leverage.debtToEquity)} />
        <Metric label="Revenue Growth" value={pct(data.growth.revenueGrowthYoY)} hint="YoY" />
        <Metric label="EPS Growth" value={pct(data.growth.epsGrowthYoY)} hint="YoY" />
        <Metric label="Dividend Yield" value={pct(data.dividends.dividendYield)} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-background/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Company</p>
          <p className="mt-1 text-sm font-bold">{data.profile.name ?? data.symbol}</p>
          <p className="mt-1 text-xs text-muted-foreground">{data.profile.sector ?? "Sector unavailable"} · {data.profile.industry ?? "Industry unavailable"}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Coverage</p>
          <p className="mt-1 text-sm font-bold">{data.quarterlyResults.length} quarters · {data.annualResults.length} annual periods</p>
          <p className="mt-1 text-xs text-muted-foreground">Provider: {data.provider} · fetched {age(data.fetchedAt)}</p>
        </div>
      </div>
    </div>
  );
}

function NewsView({ data }: { data: NewsFeed | null }) {
  if (!data) return <Empty text="Live news is unavailable for this symbol." />;
  if (!data.articles.length && !data.events.length) return <Empty text="No verified news or company events were returned by the configured providers." />;
  return (
    <div className="space-y-3">
      {data.articles.slice(0, 10).map((article) => (
        <a key={article.id} href={article.url} target="_blank" rel="noreferrer" className="group block rounded-xl border border-border/70 bg-background/40 p-3 transition hover:border-primary/40">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold leading-5 group-hover:text-primary">{article.title}</p><p className="mt-1 text-[10px] text-muted-foreground">{article.source.name} · {article.publishedAt ? new Date(article.publishedAt).toLocaleString("en-IN") : "Date unavailable"}</p></div><ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /></div>
          {article.summary ? <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{article.summary}</p> : null}
        </a>
      ))}
    </div>
  );
}

function EventsView({ data }: { data: NewsFeed | null }) {
  if (!data?.events.length && !data?.corporateActions.length) return <Empty text="No verified corporate events or actions were returned." />;
  return (
    <div className="space-y-3">
      {data?.corporateActions.map((item) => <div key={item.id} className="rounded-xl border border-border/70 bg-background/40 p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold capitalize">{item.kind}</span><span className="text-[10px] text-muted-foreground">{item.exDate ?? item.announcedAt ?? "Date unavailable"}</span></div><p className="mt-1 text-xs text-muted-foreground">{item.description}</p>{item.url ? <a className="mt-2 inline-flex text-[10px] font-semibold text-primary" href={item.url} target="_blank" rel="noreferrer">Open source <ExternalLink className="ml-1 h-3 w-3" /></a> : null}</div>)}
      {data?.events.map((item) => <div key={item.id} className="rounded-xl border border-border/70 bg-background/40 p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold">{item.title}</span><span className="text-[10px] text-muted-foreground">{item.eventDate ?? item.announcedAt ?? "Date unavailable"}</span></div><p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{item.type} · {item.source.name}</p>{item.detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p> : null}</div>)}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border bg-background/30 p-6 text-center text-xs text-muted-foreground">{text}</div>;
}

export function StockIntelligencePanel({ symbol }: { symbol: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const quote = useQuery(quoteQuery(symbol));
  const technical = useQuery({ queryKey: ["technical", symbol], queryFn: () => getTechnicalAnalysis({ data: { symbol, interval: "1d", range: "1y" } }), staleTime: 60_000, refetchInterval: 60_000 });
  const fundamental = useQuery({ queryKey: ["fundamental", symbol], queryFn: () => getFundamentals({ data: { symbol, quarters: 12, years: 10 } }), staleTime: 5 * 60_000, refetchInterval: 5 * 60_000 });
  const news = useQuery({ queryKey: ["news", symbol], queryFn: () => getNewsFeed({ data: { symbol, query: null, limit: 30, sinceDays: 7 } }), staleTime: 60_000, refetchInterval: 60_000 });
  const q = quote.data;
  const t = technical.data?.ok ? technical.data.data : null;
  const f = fundamental.data?.ok ? fundamental.data.data : null;
  const n = news.data?.ok ? news.data.data : null;
  const newsCount = n?.articles.length ?? 0;
  const eventCount = (n?.events.length ?? 0) + (n?.corporateActions.length ?? 0);
  const sourceCount = useMemo(() => new Set((n?.coverage ?? []).filter((x) => x.ok).map((x) => x.providerId)).size, [n]);

  return (
    <section className="rounded-2xl border border-border/70 bg-surface-1/70 shadow-sm">
      <div className="border-b border-border/70 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><BarChart3 className="h-4 w-4" /></span><div><h2 className="truncate text-base font-black sm:text-lg">{q?.name ?? symbol}</h2><p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{q?.exchange ?? "NSE/BSE"} · {symbol}</p></div></div>
          </div>
          <div className="flex items-center gap-2"><State ok={Boolean(q?.price)} label={q?.marketState === "REGULAR" ? "LIVE" : "MARKET CLOSED"} /><button type="button" onClick={() => { void quote.refetch(); void technical.refetch(); void fundamental.refetch(); void news.refetch(); }} className="rounded-lg border border-border bg-background/50 p-2 text-muted-foreground hover:text-foreground" aria-label="Refresh stock intelligence"><RefreshCw className="h-3.5 w-3.5" /></button></div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Last Price" value={q?.price == null ? "—" : `₹${num(q.price)}`} hint={`${q?.changePercent == null ? "—" : pct(q.changePercent)} today`} />
          <Metric label="Day Range" value={`${q?.dayLow == null ? "—" : num(q.dayLow)} – ${q?.dayHigh == null ? "—" : num(q.dayHigh)}`} />
          <Metric label="Volume" value={num(q?.volume, 0)} />
          <Metric label="52W Range" value={`${q?.fiftyTwoWeekLow == null ? "—" : num(q.fiftyTwoWeekLow)} – ${q?.fiftyTwoWeekHigh == null ? "—" : num(q.fiftyTwoWeekHigh)}`} />
        </div>
      </div>
      <div className="overflow-x-auto border-b border-border/70 px-3"><div className="flex min-w-max gap-1 py-2">{tabs.map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"}`}>{label}</button>)}</div></div>
      <div className="p-4 sm:p-5">
        {tab === "overview" ? <div className="space-y-4"><div className="grid gap-3 lg:grid-cols-3"><div className="rounded-xl border border-border/70 bg-background/40 p-4 lg:col-span-2"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold">Market snapshot</p><p className="text-[10px] text-muted-foreground">Real provider data · auto refreshed</p></div><Clock3 className="h-4 w-4 text-muted-foreground" /></div><div className="grid gap-3 sm:grid-cols-3"><Metric label="Trend" value={t?.indicators.trend.trend?.toUpperCase() ?? "—"} hint={t ? `${t.indicators.trend.bias} · ${t.indicators.trend.strength}/100` : undefined} /><Metric label="RSI" value={num(t?.indicators.rsi)} /><Metric label="P/E" value={num(f?.valuation.peRatioTTM)} /></div></div><div className="rounded-xl border border-border/70 bg-background/40 p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><p className="text-xs font-bold">Data health</p></div><div className="mt-3 space-y-2 text-[11px]"><div className="flex justify-between"><span>Price</span><span>{age(q ? Date.now() - 1 : null)}</span></div><div className="flex justify-between"><span>Technical</span><span>{age(t?.asOf)}</span></div><div className="flex justify-between"><span>Fundamental</span><span>{age(f?.fetchedAt)}</span></div><div className="flex justify-between"><span>News providers</span><span>{sourceCount || "—"}</span></div></div></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="News" value={String(newsCount)} hint="last 7 days" /><Metric label="Corporate Events" value={String(eventCount)} hint="verified feed" /><Metric label="ROE" value={pct(f?.profitability.roe)} /><Metric label="Debt / Equity" value={num(f?.leverage.debtToEquity)} /></div></div> : null}
        {tab === "price" ? <div className="space-y-3"><div className="rounded-xl border border-border/70 bg-background/30 p-4"><p className="text-xs font-bold">Price & chart workspace</p><p className="mt-1 text-xs text-muted-foreground">Use the chart above for candles. This panel keeps the latest quote, range and volume available beside technical and AI analysis.</p></div><div className="grid gap-3 sm:grid-cols-4"><Metric label="Open" value={num(q?.open)} /><Metric label="Previous Close" value={num(q?.previousClose)} /><Metric label="Change" value={num(q?.change)} /><Metric label="Change %" value={pct(q?.changePercent)} /></div></div> : null}
        {tab === "technical" ? <TechnicalView data={t} /> : null}
        {tab === "fundamental" ? <FundamentalView data={f} /> : null}
        {tab === "news" ? <div><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><Newspaper className="h-4 w-4 text-primary" /><p className="text-xs font-bold">Live news intelligence</p></div><span className="text-[10px] text-muted-foreground">auto refresh 60s</span></div><NewsView data={n} /></div> : null}
        {tab === "events" ? <div><div className="mb-3 flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><p className="text-xs font-bold">Corporate actions & events</p></div><EventsView data={n} /></div> : null}
      </div>
    </section>
  );
}
