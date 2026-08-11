import { useState } from "react";
import { askAI } from "@/lib/ai.functions";

const modules = [
  ["7.2", "Technical Setup Scanner", "Scan technical conditions such as trend, EMA alignment, RSI, volume and breakout readiness."],
  ["7.3", "Breakout & Momentum Intelligence", "Evaluate breakout quality, momentum strength, volume confirmation and failure risk."],
  ["7.4", "Swing Trade Signal Engine", "Generate evidence-backed swing setups with bullish, neutral or bearish interpretation."],
  ["7.5", "Entry / Stop-Loss / Target Intelligence", "Research entry zones, invalidation levels, risk-reward and target scenarios."],
  ["7.6", "Trade Risk & Position Sizing", "Assess risk per trade, concentration and position-sizing considerations."],
  ["7.7", "Strategy Backtesting", "Research a strategy's historical behavior and clearly surface missing data or limitations."],
  ["7.8", "Trade Journal & Performance Analytics", "Review trade outcomes, recurring mistakes, win/loss patterns and performance drivers."],
  ["7.9", "Advanced Market Scanner", "Research multiple stocks for high-quality setups and rank candidates with evidence."],
  ["7.10", "AI Trading Command Center", "Bring scanner, setups, risk, backtesting and journal intelligence into one workspace."],
] as const;

export function TradingIntelligence() {
  const [symbol, setSymbol] = useState("INFY");
  const [running, setRunning] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const run = async (id: string, title: string) => {
    setRunning(id);
    setError("");
    try {
      const result = await askAI({
        data: {
          question: `${title} for ${symbol}. Give an evidence-backed research assessment. Include executive summary, technical analysis, risks, missing information, confidence score and sources. Do not invent unavailable market data.`,
          symbols: [symbol.trim().toUpperCase()],
        },
      });
      if (result.ok) setAnswers((prev) => ({ ...prev, [id]: result.data.summary }));
      else setError(result.error.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Research request failed.");
    } finally {
      setRunning(null);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="panel p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Phase 7 · Trading Intelligence</p>
          <h1 className="mt-1 text-3xl font-black">AI Trading Intelligence</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Production-oriented research workspace for phases 7.2–7.10. Every module stays behind the existing AI reasoning boundary.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} maxLength={24} className="w-full rounded-xl border border-border bg-background px-4 py-3 font-semibold uppercase outline-none sm:max-w-xs" placeholder="NSE symbol" aria-label="NSE symbol" />
            <div className="rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground">AI-only access · No direct provider calls</div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {modules.map(([id, title, description]) => (
            <article key={id} className="panel p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="rounded-full border border-border px-2 py-1 text-xs font-bold">{id}</span>
                  <h2 className="mt-3 text-lg font-bold">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
                <button disabled={!symbol.trim() || running !== null} onClick={() => void run(id, title)} className="shrink-0 rounded-xl border border-border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                  {running === id ? "Researching…" : "Analyze"}
                </button>
              </div>
              {answers[id] && <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4 text-sm leading-6 whitespace-pre-wrap">{answers[id]}</div>}
            </article>
          ))}
        </section>

        {error && <div role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">{error}</div>}
        <footer className="text-xs text-muted-foreground">Research output is informational. Historical or unavailable data is not fabricated; confidence depends on available evidence.</footer>
      </div>
    </main>
  );
}
