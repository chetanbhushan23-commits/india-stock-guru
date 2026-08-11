import { useMemo, useState } from "react";
import { Bookmark, Copy, Plus, RefreshCw, Trash2 } from "lucide-react";
import { askAI } from "@/lib/ai.functions";
import type { AIReasoningResult } from "@/lib/ai/ai-types";

type Item = { symbol: string; note: string };
const initialItems: Item[] = [
  { symbol: "INFY", note: "Monitor trend, valuation and recent developments" },
  { symbol: "RELIANCE", note: "Monitor corporate actions, news and risk" },
];

export function ResearchWatchlist() {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [symbol, setSymbol] = useState("");
  const [note, setNote] = useState("");
  const [results, setResults] = useState<Record<string, AIReasoningResult>>({});
  const [running, setRunning] = useState<string | null>(null);
  const count = useMemo(() => items.length, [items]);

  const add = () => {
    const value = symbol.trim().toUpperCase();
    if (!value || items.some((x) => x.symbol === value)) return;
    setItems((prev) => [...prev, { symbol: value, note: note.trim() || "Research this stock" }]);
    setSymbol(""); setNote("");
  };

  const run = async (item: Item) => {
    setRunning(item.symbol);
    try {
      const result = await askAI({ data: { question: `Review ${item.symbol} for my research watchlist. ${item.note}. Summarize the latest verified technical, fundamental, news, corporate-action and risk evidence, including missing information.`, symbols: [item.symbol] } });
      setResults((prev) => ({ ...prev, [item.symbol]: result }));
    } finally { setRunning(null); }
  };

  return <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6">
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Phase 6.10</p><h1 className="text-2xl font-black">Research Watchlist</h1><p className="text-sm text-muted-foreground">Saved research targets powered only through the AI reasoning boundary.</p></div>
        <div className="rounded-xl border border-border px-3 py-2 text-sm"><b>{count}</b> stocks</div>
      </header>
      <section className="panel grid gap-2 p-4 sm:grid-cols-[1fr_2fr_auto]">
        <input value={symbol} onChange={(e) => setSymbol(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="NSE symbol" className="rounded-xl border border-border bg-surface-2 px-3 py-2" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should AI monitor?" className="rounded-xl border border-border bg-surface-2 px-3 py-2" />
        <button onClick={add} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground"><Plus size={17}/> Add</button>
      </section>
      <section className="space-y-3">{items.map((item) => {
        const result = results[item.symbol];
        return <article key={item.symbol} className="panel p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="flex items-center gap-2"><Bookmark size={17}/><h2 className="font-bold">{item.symbol}</h2></div><p className="mt-1 text-sm text-muted-foreground">{item.note}</p></div>
            <div className="flex gap-2"><button onClick={() => setItems((prev) => prev.filter((x) => x.symbol !== item.symbol))} className="rounded-xl border border-border p-2" aria-label={`Remove ${item.symbol}`}><Trash2 size={17}/></button><button onClick={() => void run(item)} disabled={running === item.symbol} className="rounded-xl border border-border p-2" aria-label={`Research ${item.symbol}`}>{running === item.symbol ? <RefreshCw className="animate-spin" size={17}/> : <RefreshCw size={17}/>}</button></div>
          </div>
          {result?.ok && <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">Confidence {result.data.confidence}% · {result.data.sources.length} sources</span><button onClick={() => void navigator.clipboard.writeText(result.data.summary)} className="rounded-lg border border-border p-1.5" aria-label="Copy summary"><Copy size={15}/></button></div><p className="mt-2 text-sm leading-6">{result.data.summary}</p></div>}
          {result && !result.ok && <p className="mt-3 text-sm text-destructive">{result.error.message}</p>}
        </article>;
      })}</section>
      <p className="text-xs text-muted-foreground">This is a saved, on-demand research list. It does not poll market providers or alter existing engines.</p>
    </div>
  </main>;
}
