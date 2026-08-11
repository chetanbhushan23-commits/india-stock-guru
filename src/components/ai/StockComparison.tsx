import { useMemo, useState } from "react";
import { ArrowRightLeft, Copy, Download, RefreshCw } from "lucide-react";
import { askAI } from "@/lib/ai.functions";
import type { AIReasoningResult } from "@/lib/ai/ai-types";

const DEFAULTS = ["INFY", "TCS"];

function claims(result: AIReasoningResult) {
  if (!result.ok) return [];
  return [
    ["Executive Summary", result.data.summary],
    ["Technical Analysis", result.data.technicalEvidence.map(c => c.statement).join("\n")],
    ["Fundamental Analysis", result.data.fundamentalEvidence.map(c => c.statement).join("\n")],
    ["News Analysis", result.data.newsEvidence.map(c => c.statement).join("\n")],
    ["Corporate Actions", result.data.corporateEvents.map(c => c.statement).join("\n")],
    ["Risks", result.data.risks.map(c => c.statement).join("\n")],
    ["Missing Information", result.data.missingInformation.join("\n")],
  ].filter(([, value]) => Boolean(value));
}

export function StockComparison() {
  const [symbols, setSymbols] = useState(DEFAULTS);
  const [result, setResult] = useState<AIReasoningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const prompt = useMemo(() => `Compare ${symbols[0]} and ${symbols[1]} using verified evidence. Compare technicals, fundamentals, news, corporate actions and risks. Explain which is stronger for the stated evidence and what information is missing.`, [symbols]);

  const run = async () => {
    if (loading || symbols.some(s => !s.trim())) return;
    setLoading(true);
    try { setResult(await askAI({ data: { question: prompt, symbols: symbols.map(s => s.trim().toUpperCase()) } })); }
    finally { setLoading(false); }
  };

  const markdown = result?.ok ? claims(result).map(([title, value]) => `## ${title}\n\n${value}`).join("\n\n") + (result.data.sources.length ? `\n\n## Sources\n\n${result.data.sources.map(s => `- [${s.name}](${s.url ?? ""})`).join("\n")}` : "") : "");
  const copy = () => markdown && navigator.clipboard.writeText(markdown);
  const download = () => { if (!markdown) return; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" })); a.download = `${symbols.join("-vs-")}-comparison.md`; a.click(); };

  return <section className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6">
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="panel p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Phase 6.6</p><h1 className="text-2xl font-black">Stock Comparison</h1><p className="mt-1 text-sm text-muted-foreground">Evidence-backed comparison through the existing AI reasoning engine.</p></header>
      <div className="panel p-4"><div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto]"><input value={symbols[0]} onChange={e => setSymbols([e.target.value, symbols[1]])} className="rounded-xl border border-border bg-surface-2 px-3 py-2 uppercase"/><div className="flex items-center justify-center"><ArrowRightLeft className="text-muted-foreground"/></div><input value={symbols[1]} onChange={e => setSymbols([symbols[0], e.target.value])} className="rounded-xl border border-border bg-surface-2 px-3 py-2 uppercase"/><button onClick={() => void run()} disabled={loading} className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground">{loading ? "Comparing…" : "Compare"}</button></div><p className="mt-3 text-xs text-muted-foreground">Only askAI() is called; market providers are not accessed by this UI.</p></div>
      {result?.ok && <div className="grid gap-4 sm:grid-cols-3"><div className="panel p-4"><p className="text-xs text-muted-foreground">Confidence</p><p className="text-2xl font-black">{result.data.confidence}%</p></div><div className="panel p-4"><p className="text-xs text-muted-foreground">Evidence claims</p><p className="text-2xl font-black">{result.data.evidence.length + result.data.technicalEvidence.length + result.data.fundamentalEvidence.length + result.data.newsEvidence.length}</p></div><div className="panel p-4"><p className="text-xs text-muted-foreground">Sources</p><p className="text-2xl font-black">{result.data.sources.length}</p></div></div>}
      {result?.ok && <div className="grid gap-4 lg:grid-cols-2">{claims(result).map(([title, value]) => <article key={title} className="panel p-4"><h2 className="font-bold">{title}</h2><div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{value}</div></article>)}</div>}
      {result?.ok && <div className="panel p-4"><div className="flex items-center justify-between"><h2 className="font-bold">Sources</h2><div className="flex gap-2"><button onClick={copy} className="rounded-lg border border-border p-2" aria-label="Copy comparison"><Copy size={16}/></button><button onClick={download} className="rounded-lg border border-border p-2" aria-label="Export comparison"><Download size={16}/></button><button onClick={() => void run()} className="rounded-lg border border-border p-2" aria-label="Refresh comparison"><RefreshCw size={16}/></button></div></div><div className="mt-3 space-y-2">{result.data.sources.map(s => <a key={s.id} href={s.url ?? "#"} target="_blank" rel="noreferrer" className="block rounded-xl border border-border p-3 text-sm hover:bg-surface-2">{s.name}<span className="ml-2 text-xs text-muted-foreground">{s.domain}</span></a>)}</div></div>}
      {result && !result.ok && <div className="panel p-5 text-sm text-destructive">{result.error.message}</div>}
      {!result && <div className="panel p-8 text-center text-sm text-muted-foreground">Compare two NSE/BSE symbols to generate an evidence-backed research view.</div>}
    </div>
  </section>;
}
