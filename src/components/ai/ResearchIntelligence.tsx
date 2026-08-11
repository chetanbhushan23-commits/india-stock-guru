import { useMemo, useState } from "react";
import { Copy, Download, RefreshCw, Star } from "lucide-react";
import { askAI } from "@/lib/ai.functions";
import { buildResearchSections, researchConfidence, researchMarkdown } from "@/lib/ai/research-intelligence";
import type { AIReasoningResult } from "@/lib/ai/ai-types";

const PROMPTS = [
  "Give me a complete research view of this stock",
  "What is the bull case and bear case?",
  "What are the biggest risks right now?",
];

export function ResearchIntelligence({ symbol = "INFY" }: { symbol?: string }) {
  const [question, setQuestion] = useState(PROMPTS[0]);
  const [result, setResult] = useState<AIReasoningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [pinned, setPinned] = useState(false);

  const runResearch = async (prompt = question) => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      setResult(await askAI({ data: { question: prompt, symbols: [symbol] } }));
    } finally {
      setLoading(false);
    }
  };

  const markdown = useMemo(() => (result ? researchMarkdown(result) : ""), [result]);
  const confidence = result ? researchConfidence(result) : null;
  const sections = result ? buildResearchSections(result) : [];

  const copy = async () => { if (markdown) await navigator.clipboard.writeText(markdown); };
  const download = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${symbol}-research.md`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <section className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="panel flex flex-wrap items-center justify-between gap-3 p-4">
          <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Research Intelligence</p><h1 className="text-2xl font-black">{symbol} Research Workspace</h1></div>
          <div className="flex gap-2">
            <button onClick={() => setPinned(!pinned)} className="rounded-xl border border-border p-2" aria-label="Pin research"><Star className={pinned ? "fill-current" : ""}/></button>
            <button onClick={copy} disabled={!markdown} className="rounded-xl border border-border p-2" aria-label="Copy research"><Copy/></button>
            <button onClick={download} disabled={!markdown} className="rounded-xl border border-border p-2" aria-label="Export markdown"><Download/></button>
            <button onClick={() => runResearch()} disabled={loading} className="rounded-xl border border-border p-2" aria-label="Refresh research"><RefreshCw className={loading ? "animate-spin" : ""}/></button>
          </div>
        </header>

        <div className="panel p-4">
          <div className="flex flex-col gap-2 sm:flex-row"><input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void runResearch(); }} className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2"/><button onClick={() => void runResearch()} disabled={loading} className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground">{loading ? "Researching…" : "Research"}</button></div>
          <div className="mt-3 flex flex-wrap gap-2">{PROMPTS.map(p => <button key={p} onClick={() => { setQuestion(p); void runResearch(p); }} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">{p}</button>)}</div>
        </div>

        {!result && !loading && <div className="panel p-8 text-center text-sm text-muted-foreground">Run research to generate an evidence-based workspace through the existing AI reasoning engine.</div>}
        {loading && <div className="panel animate-pulse p-8 text-center text-sm text-muted-foreground">Building research context…</div>}
        {result && result.ok && <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="panel p-4"><p className="text-xs text-muted-foreground">Confidence</p><p className="mt-1 text-2xl font-black">{confidence == null ? "—" : `${confidence}%`}</p></div>
            <div className="panel p-4"><p className="text-xs text-muted-foreground">Symbol</p><p className="mt-1 text-2xl font-black">{symbol}</p></div>
            <div className="panel p-4"><p className="text-xs text-muted-foreground">Status</p><p className="mt-1 text-2xl font-black">Evidence ready</p></div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">{sections.map(s => <article key={s.title} className="panel p-4"><h2 className="font-bold">{s.title}</h2><div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{s.content}</div></article>)}</div>
        </>}
        {result && !result.ok && <div className="panel p-5 text-sm text-destructive">{result.error.message}</div>}
      </div>
    </section>
  );
}
