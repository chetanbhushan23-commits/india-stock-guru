import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Bot,
  ChevronRight,
  FileSearch,
  LineChart,
  Newspaper,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { MarketOverview } from "@/components/market/MarketOverview";
import { StockSearch } from "@/components/market/StockSearch";
import { Watchlist } from "@/components/market/Watchlist";
import { Portfolio } from "@/components/market/Portfolio";
import { AiAssistant } from "@/components/market/AiAssistant";
import { NewsFeed } from "@/components/market/NewsFeed";
import { ChartPanel } from "@/components/market/ChartPanel";
import { StockIntelligencePanel } from "@/components/market/StockIntelligencePanel";
import { defaultWatchlist } from "@/data/market";
import { quoteQuery } from "@/lib/market-queries";
import { stripSuffix } from "@/lib/market-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChetanMarkets AI — Grounded Indian Stock Market Intelligence" },
      {
        name: "description",
        content:
          "ChetanMarkets AI — grounded NSE/BSE stock intelligence with technical, fundamental, news, research and AI evidence in one responsive market terminal.",
      },
    ],
  }),
  component: Dashboard,
});

const intelligenceModules = [
  { to: "/ai-assistant", icon: Bot, title: "AI Research", text: "Ask grounded questions with evidence, sources and confidence." },
  { to: "/research", icon: FileSearch, title: "Research", text: "Evidence timeline, conflicts, source quality and company research." },
  { to: "/compare", icon: BarChart3, title: "Compare Stocks", text: "Compare technical, fundamental and research signals side by side." },
  { to: "/strategy-scanner", icon: LineChart, title: "Strategy Scanner", text: "Scan the market using rule-based swing and trend conditions." },
  { to: "/trading-intelligence", icon: Activity, title: "Trading Intelligence", text: "Market regime, setups, risk and execution context." },
  { to: "/research-alerts", icon: ShieldCheck, title: "Research Alerts", text: "Monitor evidence changes, news events and important risks." },
];

function Dashboard() {
  const queryClient = useQueryClient();
  const [watchlist, setWatchlist] = useState<string[]>(defaultWatchlist);
  const [activeSymbol, setActiveSymbol] = useState(defaultWatchlist[0]!);
  const { data: activeQuote, isLoading } = useQuery(quoteQuery(activeSymbol));
  const toggleWatch = (symbol: string) => setWatchlist((prev) => prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]);
  const symbol = stripSuffix(activeSymbol);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><Activity className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-black tracking-tight sm:text-lg">ChetanMarkets AI</h1>
              <p className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Grounded Indian Stock Market AI</p>
            </div>
          </div>
          <nav className="hidden flex-1 items-center justify-center gap-1 xl:flex" aria-label="Primary navigation">
            {[["Dashboard", "/"], ["AI Research", "/ai-assistant"], ["Research", "/research"], ["Compare", "/compare"], ["Scanner", "/strategy-scanner"]].map(([label, to]) => (
              <Link key={to} to={to} className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-surface-2 hover:text-foreground" activeProps={{ className: "rounded-lg bg-surface-2 px-3 py-2 text-xs font-semibold text-foreground" }}>{label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-bull/10 px-2.5 py-1 text-[10px] font-semibold text-bull sm:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-bull" />{activeQuote?.marketState === "REGULAR" ? "MARKET OPEN" : "MARKET CLOSED"}</span>
            <button type="button" aria-label="Refresh all market data" onClick={() => queryClient.invalidateQueries()} className="rounded-xl border border-border bg-surface-2/70 p-2 text-muted-foreground transition hover:text-foreground"><RefreshCw className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <section className="rounded-2xl border border-border/70 bg-surface-1/70 p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Market Intelligence Terminal</p><h2 className="mt-1 text-sm font-bold sm:text-base">Search any NSE / BSE listed company</h2></div><div className="hidden items-center gap-1.5 text-[10px] text-muted-foreground sm:flex"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Grounded evidence</div></div>
          <StockSearch watchlist={watchlist} onToggle={toggleWatch} />
        </section>
        <MarketOverview />
        <StockIntelligencePanel symbol={activeSymbol} />
        <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4"><ChartPanel quote={activeQuote} symbol={activeSymbol} isLoading={isLoading} /><Portfolio /></div>
          <aside className="min-w-0 space-y-4"><div className="flex items-center gap-2 px-1"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/12 text-primary"><Sparkles className="h-3.5 w-3.5" /></span><div><p className="text-xs font-bold">AI Intelligence</p><p className="text-[10px] text-muted-foreground">{symbol} · evidence-backed</p></div></div><AiAssistant activeSymbol={symbol} /><Watchlist symbols={watchlist} activeSymbol={activeSymbol} onSelect={setActiveSymbol} onRemove={toggleWatch} /></aside>
        </section>
        <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]"><NewsFeed /><div className="rounded-2xl border border-border/70 bg-surface-1/60 p-4"><div className="mb-3 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><Newspaper className="h-4 w-4" /></span><div><h3 className="text-sm font-bold">Grounding Layer</h3><p className="text-[10px] text-muted-foreground">How every AI answer is built</p></div></div><div className="space-y-2 text-xs">{[["01", "Question Router", "Intent + stock resolution"], ["02", "Evidence Engine", "Technical + fundamental + news"], ["03", "Context Builder", "Freshness + conflicts + sources"], ["04", "AI Reasoning", "Interpretation without fabrication"]].map(([step, title, text]) => <div key={step} className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface-2/40 p-2.5"><span className="mt-0.5 text-[10px] font-bold text-primary">{step}</span><div className="min-w-0"><p className="font-semibold">{title}</p><p className="text-[10px] text-muted-foreground">{text}</p></div></div>)}</div></div></section>
        <section><div className="mb-3 flex items-end justify-between gap-3 px-1"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Intelligence Suite</p><h2 className="mt-1 text-base font-bold">Research, analysis & trading tools</h2></div><Link to="/ai-research-command-center" className="hidden items-center gap-1 text-xs font-semibold text-primary sm:flex">Open command center <ChevronRight className="h-3.5 w-3.5" /></Link></div><div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">{intelligenceModules.map(({ to, icon: Icon, title, text }) => <Link key={to} to={to} className="group min-w-0 rounded-2xl border border-border/70 bg-surface-1/60 p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-1"><div className="flex items-start justify-between gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" /></div><h3 className="mt-3 text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></Link>)}</div></section>
        <footer className="border-t border-border/60 py-5 text-center text-[10px] text-muted-foreground">ChetanMarkets AI · NSE/BSE research terminal · Evidence-backed AI · For personal research only</footer>
      </main>
    </div>
  );
}
