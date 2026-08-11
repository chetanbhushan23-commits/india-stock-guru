import { useState } from "react";
import { RefreshCw, Copy } from "lucide-react";
import { askAI } from "@/lib/ai.functions";
import type { AIReasoningResult } from "@/lib/ai/ai-types";

const DEFAULT_SYMBOLS = "RELIANCE, INFY, TCS, HDFCBANK";

export function StrategyScanner() {
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS);
  const [strategy, setStrategy] = useState("Swing setup: trend, momentum, volume confirmation, breakout risk and stop-loss considerations");
  const [result, setResult] = useState<AIReasoningResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function scan() {
    const list = symbols.split(",").map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 4);
    if (!list.length) return;
    setLoading(true);
    try {
      const response = await askAI({ data: { question: `Run this strategy research across these stocks: ${strategy}. Compare the candidates, highlight qualifying setups, risks, missing information and confidence.`, symbols: list } });
      setResult(response);
    } finally { setLoading(false); }
  }

  async function copy() {
    if (result?.ok) await navigator.clipboard.writeText(result.data.summary);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="panel p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Phase 7.1 · Trading Intelligence</p>
          <h1 className="mt-1 text-2xl font-black">AI Strategy Scanner</h1>
          <p className="mt-1 text-sm text-muted-foreground">Research candidates through the existing AI reasoning boundary. No direct market-provider access.</p>
        </header>
        <section className="panel space-y-4 p-5">
          <label className="block text-sm font-semibold">NSE symbols (up to 4)
            <input value={symbols} onChange={e => setSymbols(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2" placeholder="RELIANCE, INFY, TCS" />
          </label>
          <label className="block text-sm font-semibold">Strategy rules
            <textarea value={strategy} onChange={e => setStrategy(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2" />
          </label>
          <button onClick={() => void scan()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 font-semibold disabled:opacity-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> {loading ? "Scanning…" : "Run AI Scan"}
          </button>
        </section>
        {result?.ok && <section className="panel p-5">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">Strategy Research</h2><p className="text-xs text-muted-foreground">Confidence {result.data.confidence}% · {result.data.sources.length} sources</p></div><button onClick={() => void copy()} className="rounded-lg border border-border p-2" aria-label="Copy result"><Copy size={16} /></button></div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{result.data.summary}</p>
        </section>}
        {result && !result.ok && <section className="panel p-5 text-sm text-destructive">{result.error.message}</section>}
      </div>
    </main>
  );
}
