import { useMemo, useState } from "react";
import { askAI } from "@/lib/ai.functions";

type Module = {
  id: string;
  title: string;
  description: string;
  prompt: string;
};

const MODULES: Module[] = [
  { id: "8.2", title: "Feature Engineering", description: "Feature readiness, data quality and feature design assessment.", prompt: "Assess feature engineering readiness for {symbol}, including feature families, missing-data risks and leakage risks." },
  { id: "8.3", title: "ML Signal Prediction", description: "Prediction-oriented signal assessment with uncertainty.", prompt: "Assess ML signal prediction opportunities for {symbol}; separate evidence, assumptions and uncertainty." },
  { id: "8.4", title: "Price / Trend Forecasting", description: "Forecasting framework with explicit uncertainty and scenarios.", prompt: "Provide a price and trend forecasting assessment for {symbol} using scenarios and clearly state uncertainty." },
  { id: "8.5", title: "Anomaly Detection", description: "Identify unusual behaviour and potential data/event anomalies.", prompt: "Assess anomaly detection opportunities for {symbol}, including unusual price, volume, news or corporate-event patterns." },
  { id: "8.6", title: "Market Regime Detection", description: "Classify market conditions and regime-change risks.", prompt: "Assess the current market-regime framework for {symbol}, including trend, volatility and regime-change risks." },
  { id: "8.7", title: "Explainability", description: "Confidence, drivers, limitations and model transparency.", prompt: "Explain the strongest drivers and limitations for an ML assessment of {symbol}; include confidence and missing information." },
  { id: "8.8", title: "ML Backtesting", description: "Backtest design, leakage controls and evaluation criteria.", prompt: "Design a robust ML backtesting framework for {symbol}, including walk-forward validation, leakage controls and evaluation metrics." },
  { id: "8.9", title: "Adaptive Learning", description: "Monitor model drift and define safe adaptation rules.", prompt: "Design an adaptive-learning monitoring plan for {symbol}, including drift detection, retraining triggers and safeguards." },
  { id: "8.10", title: "ML Command Center", description: "Unified view of the complete ML intelligence lifecycle.", prompt: "Create a unified ML intelligence assessment for {symbol} covering features, prediction, forecasting, anomalies, regimes, explainability, backtesting and adaptation." },
];

export function MLIntelligenceSuite() {
  const [symbol, setSymbol] = useState("INFY");
  const [active, setActive] = useState("8.10");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const current = useMemo(() => MODULES.find((m) => m.id === active) ?? MODULES[0], [active]);

  const run = async () => {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return;
    setLoading(true);
    setResult("");
    try {
      const response = await askAI({
        data: {
          question: current.prompt.replaceAll("{symbol}", normalized),
          symbols: [normalized],
        },
      });
      setResult(response.ok ? response.data.summary : response.error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="panel p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Phase 8.2 → 8.10</p>
          <h1 className="text-2xl font-black sm:text-3xl">ML Intelligence Command Center</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Unified ML lifecycle workspace. This presentation layer calls only askAI() and does not access market providers directly.</p>
        </header>

        <section className="panel p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2" placeholder="NSE symbol" aria-label="NSE symbol" />
            <button onClick={() => void run()} disabled={loading || !symbol.trim()} className="rounded-xl border border-border px-5 py-2 font-semibold disabled:opacity-50">{loading ? "Analyzing…" : "Run AI assessment"}</button>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((module) => (
            <button key={module.id} onClick={() => setActive(module.id)} className={`panel p-4 text-left transition ${active === module.id ? "ring-2 ring-primary" : ""}`}>
              <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-muted-foreground">{module.id}</span><span className="text-xs">AI</span></div>
              <h2 className="mt-2 font-bold">{module.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
            </button>
          ))}
        </section>

        <section className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Selected module</p><h2 className="text-xl font-bold">{current.id} — {current.title}</h2></div>
            <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold">askAI only</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{current.description}</p>
          {result && <div className="mt-5 rounded-xl border border-border p-4"><h3 className="font-bold">AI Assessment</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{result}</p></div>}
        </section>
      </div>
    </main>
  );
}
