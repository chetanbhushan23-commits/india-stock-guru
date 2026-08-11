import { useMemo, useState } from "react";
import { Copy, Download, RefreshCw } from "lucide-react";
import { askAI } from "@/lib/ai.functions";
import type { AIReasoningResult } from "@/lib/ai/ai-types";

const DEFAULT_SYMBOLS = ["INFY", "TCS", "RELIANCE"];

function sections(result: AIReasoningResult) {
  if (!result.ok) return [] as Array<[string, string]>;
  return [
    ["Executive Summary", result.data.summary],
    ["Technical Analysis", result.data.technicalEvidence.map(x => x.statement).join("\n")],
    ["Fundamental Analysis", result.data.fundamentalEvidence.map(x => x.statement).join("\n")],
    ["News Analysis", result.data.newsEvidence.map(x => x.statement).join("\n")],
    ["Corporate Actions", result.data.corporateEvents.map(x => x.statement).join("\n")],
    ["Risks", result.data.risks.map(x => x.statement).join("\n")],
    ["Missing Information", result.data.missingInformation.join("\n")],
  ].filter(([, value]) => Boolean(value));
}

export function PortfolioIntelligence() {
  const [symbolsText, setSymbolsText] = useState(DEFAULT_SYMBOLS.join(", "));
  const [result, setResult] = useState<AIReasoningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const symbols = useMemo(() => symbolsText.split(",").map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 10), [symbolsText]);
  const prompt = useMemo(() => `Review this portfolio/watchlist: ${symbols.join(", ")}. Produce an evidence-backed portfolio intelligence report. Identify concentration, relative strengths, technical/fundamental concerns, news and corporate-action risks, missing information, and what should be monitored. Do not invent holdings or prices.`, [symbols]);

  const run = async () => {
    if (!symbols.length || loading) return;
    setLoading(true);
    try { setResult(await askAI({ data: { question: prompt, symbols } })); }
    finally { setLoading(false); }
  };

  const markdown = result?.ok ? sections(result).map(([t, v]) => `## ${t}\n\n${v}`).join("\n\n") + `\n\n## Sources\n\n${result.data.sources.map(s => `- [${s.name}](${s.url ?? ""})`).join("\n")}` : "";
  const copy = () => { if (markdown) void navigator.clipboard.writeText(markdown); };
  const download = () => { if (!markdown) return; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" })); a.download = "portfolio-research.md"; a.click(); };

  return <section className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6"><div className="mx-auto max-w-6xl space-y-4">
    <header className="panel p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Phase 6.7</p><h1 className="text-2xl font-black">Portfolio Intelligence</h1><p className="mt-1 text-sm text-muted-foreground">Evidence-backed portfolio review through the existing AI reasoning engine.</p></header>
    <div className="panel p-4"><label className="text-sm font-semibold">Symbols</label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input value={symbolsText} onChange={e => setSymbolsText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void run(); }} placeholder="INFY, TCS, RELIANCE" className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2"/><button onClick={() => void run()} disabled={loading} className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground">{loading ? "Analyzing…" : "Analyze Portfolio"}</button></div><p className="mt-2 text-xs text-muted-foreground">Up to 10 symbols. This interface calls only askAI(); it does not access market providers.</p></div>
    {result?.ok && <div className="grid gap-4 sm:grid-cols-3"><div className="panel p-4"><p className="text-xs text-muted-foreground">Confidence</p><p className="text-2xl font-black">{result.data.confidence}%</p></div><div className="panel p-4"><p className="text-xs text-muted-foreground">Symbols analyzed</p><p className="text-2xl font-black">{symbols.length}</p></div><div className="panel p-4"><p className="text-xs text-muted-foreground">Sources</p><p className="text-2xl font-black">{result.data.sources.length}</p></div></div>}
    {result?.ok && <div className="grid gap-4 lg:grid-cols-2">{sections(result).map(([title, value]) => <article key={title} className="panel p-4"><h2 className="font-bold">{title}</h2><div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{value}</div></article>)}</div>}
    {result?.ok && <div className="panel p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Sources</h2><div className="flex gap-2"><button onClick={copy} className="rounded-lg border border-border p-2" aria-label="Copy report"><Copy size={16}/></button><button onClick={download} className="rounded-lg border border-border p-2" aria-label="Export markdown"><Download size={16}/></button><button onClick={() => void run()} className="rounded-lg border border-border p-2" aria-label="Refresh report"><RefreshCw size={16}/></button></div></div><div className="mt-3 space-y-2">{result.data.sources.map(s => <a key={s.id} href={s.url ?? "#"} target="_blank" rel="noreferrer" className="block rounded-xl border border-border p-3 text-sm hover:bg-surface-2">{s.name}<span className="ml-2 text-xs text-muted-foreground">{s.domain}</span></a>)}</div></div>}
    {result && !result.ok && <div className="panel p-5 text-sm text-destructive">{result.error.message}</div>}
    {!result && <div className="panel p-8 text-center text-sm text-muted-foreground">Enter your watchlist or portfolio symbols to generate an evidence-backed research review.</div>}
  </div></section>;
}
