import { useState } from "react";
import { askAI } from "@/lib/ai.functions";

export function TradingDashboard() {
  const [symbol, setSymbol] = useState("INFY");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const response = await askAI({
        data: {
          question: `Provide a structured ML-readiness and trading intelligence assessment for ${symbol}. Clearly separate model-derived evidence from assumptions.`,
          symbols: [symbol],
        },
      });
      setResult(response.ok ? response.data.summary : response.error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="panel p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Phase 8.1</p>
          <h1 className="text-2xl font-black">ML Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-assisted model readiness and trading intelligence workspace. No direct provider access.
          </p>
        </header>
        <section className="panel p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2"
              placeholder="NSE symbol"
              aria-label="NSE symbol"
            />
            <button
              onClick={() => void analyze()}
              disabled={loading || !symbol.trim()}
              className="rounded-xl border border-border px-4 py-2 font-semibold disabled:opacity-50"
            >
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </section>
        {result && (
          <section className="panel p-5">
            <h2 className="font-bold">AI Assessment</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{result}</p>
          </section>
        )}
      </div>
    </main>
  );
}
