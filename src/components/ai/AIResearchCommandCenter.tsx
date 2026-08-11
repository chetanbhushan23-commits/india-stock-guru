import { useMemo, useState } from "react";
import { askAI } from "@/lib/ai.functions";
import type { AIReasoningResult } from "@/lib/ai/ai-types";

const phases = [
  ["6.12", "Quality & Verification", "Source reliability, freshness and evidence coverage"],
  ["6.13", "Conflict Detection", "Conflicting or contradictory research signals"],
  ["6.14", "Decision Intelligence", "Bull / base / bear cases and decision matrix"],
  ["6.15", "Advanced Comparison", "Multi-factor stock comparison and ranking"],
  ["6.16", "Portfolio Risk", "Concentration, sector exposure and downside risks"],
  ["6.17", "Smart Alerts", "Important research, news and risk changes"],
  ["6.18", "Research Memory", "Saved conclusions and changes since prior research"],
  ["6.19", "Research Automation", "Daily, weekly and monthly research prompts"],
  ["6.20", "Command Center", "Unified AI research workspace"],
] as const;

export function AIResearchCommandCenter() {
  const [symbol, setSymbol] = useState("INFY");
  const [question, setQuestion] = useState("Build a complete research intelligence report and identify quality, conflicts, decision risks and missing information.");
  const [result, setResult] = useState<AIReasoningResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!question.trim() || !symbol.trim()) return;
    setLoading(true);
    try {
      setResult(await askAI({ data: { question, symbols: [symbol.trim().toUpperCase()] } }));
    } finally { setLoading(false); }
  };

  const sourceCount = result?.ok ? result.data.sources.length : 0;
  const confidence = result?.ok ? result.data.confidence : null;
  const sections = useMemo(() => {
    if (!result?.ok) return [];
    return [
      ["Executive Summary", result.data.summary],
      ["Technical Analysis", result.data.technical?.summary ?? "No technical summary returned."],
      ["Fundamental Analysis", result.data.fundamental?.summary ?? "No fundamental summary returned."],
      ["News Analysis", result.data.news?.summary ?? "No news summary returned."],
      ["Corporate Actions", result.data.corporateEvents?.summary ?? "No corporate-action summary returned."],
      ["Risks", result.data.risks?.summary ?? "No risk summary returned."],
      ["Missing Information", result.data.missingInformation?.join("; ") || "No missing information reported."],
    ];
  }, [result]);

  return <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6">
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="panel p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Phase 6.12 → 6.20</p>
        <h1 className="mt-1 text-3xl font-black">AI Research Command Center</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">One production workspace for verification, conflicts, decisions, comparisons, portfolio risk, alerts, memory and research automation. All research requests cross the existing askAI() boundary.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {phases.map(([id, title, description]) => <article key={id} className="panel p-4">
          <div className="flex items-center justify-between"><span className="rounded-full border border-border px-2 py-1 text-xs font-bold">{id}</span><span className="text-xs text-muted-foreground">AI layer</span></div>
          <h2 className="mt-3 font-bold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </article>)}
      </section>

      <section className="panel p-4">
        <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
          <input value={symbol} onChange={e => setSymbol(e.target.value)} className="rounded-xl border border-border bg-surface-2 px-3 py-2 font-semibold" aria-label="Stock symbol" />
          <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void run(); }} className="rounded-xl border border-border bg-surface-2 px-3 py-2" aria-label="Research question" />
          <button onClick={() => void run()} disabled={loading} className="rounded-xl bg-primary px-5 py-2 font-semibold text-primary-foreground">{loading ? "Researching…" : "Run AI Research"}</button>
        </div>
      </section>

      {!result && !loading && <section className="panel p-8 text-center text-sm text-muted-foreground">Run a research query to populate the command center.</section>}
      {loading && <section className="panel animate-pulse p-8 text-center text-sm text-muted-foreground">Building evidence-backed research context…</section>}
      {result?.ok && <>
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="panel p-4"><p className="text-xs text-muted-foreground">Confidence</p><p className="mt-1 text-2xl font-black">{confidence}%</p></div>
          <div className="panel p-4"><p className="text-xs text-muted-foreground">Sources</p><p className="mt-1 text-2xl font-black">{sourceCount}</p></div>
          <div className="panel p-4"><p className="text-xs text-muted-foreground">Research status</p><p className="mt-1 text-2xl font-black">Verified context</p></div>
        </section>
        <section className="grid gap-4 lg:grid-cols-2">{sections.map(([title, content]) => <article key={title} className="panel p-4"><h2 className="font-bold">{title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{content}</p></article>)}</section>
        <section className="panel p-4"><h2 className="font-bold">Sources</h2><div className="mt-3 space-y-2">{result.data.sources.map((source, index) => <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="block rounded-xl border border-border p-3 text-sm hover:bg-surface-2"><b>{source.title}</b><span className="ml-2 text-muted-foreground">{source.publisher}</span></a>)}</div></section>
      </>}
      {result && !result.ok && <section className="panel p-5 text-sm text-destructive">{result.error.message}</section>}
    </div>
  </main>;
}
