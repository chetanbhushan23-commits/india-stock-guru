import { useMemo, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { askAI } from "@/lib/ai.functions";
import type { AIReasoningResult } from "@/lib/ai/ai-types";

const PROMPTS = [
  "Build a chronological research timeline for this stock using the available evidence",
  "Summarize the most important recent developments and how they changed the research view",
  "Show the key technical, fundamental, news and corporate evidence in time order",
];

export function ResearchTimeline({ symbol = "INFY" }: { symbol?: string }) {
  const [question, setQuestion] = useState(PROMPTS[0]);
  const [result, setResult] = useState<AIReasoningResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (prompt = question) => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      setResult(await askAI({ data: { question: prompt, symbols: [symbol] } }));
    } finally { setLoading(false); }
  };

  const events = useMemo(() => {
    if (!result?.ok) return [];
    return result.data.evidenceTimeline ?? [];
  }, [result]);

  const copy = async () => {
    if (!result?.ok) return;
    await navigator.clipboard.writeText(result.data.summary + "\n\n" + events.map((e: any) => `${e.date ?? ""} — ${e.title ?? e.event ?? "Evidence"}\n${e.description ?? e.summary ?? ""}`).join("\n\n"));
  };

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="panel flex flex-wrap items-center justify-between gap-3 p-4">
          <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Phase 6.11</p><h1 className="text-2xl font-black">{symbol} Research Timeline</h1><p className="text-sm text-muted-foreground">Chronological evidence view through the existing AI reasoning boundary.</p></div>
          <div className="flex gap-2"><button onClick={() => void copy()} disabled={!result?.ok} className="rounded-xl border border-border p-2" aria-label="Copy timeline"><Copy/></button><button onClick={() => void run()} disabled={loading} className="rounded-xl border border-border p-2" aria-label="Refresh timeline"><RefreshCw className={loading ? "animate-spin" : ""}/></button></div>
        </header>
        <section className="panel p-4">
          <div className="flex flex-col gap-2 sm:flex-row"><input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void run(); }} className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2"/><button onClick={() => void run()} disabled={loading} className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground">{loading ? "Building…" : "Build timeline"}</button></div>
          <div className="mt-3 flex flex-wrap gap-2">{PROMPTS.map(p => <button key={p} onClick={() => { setQuestion(p); void run(p); }} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">{p}</button>)}</div>
        </section>
        {loading && <div className="panel animate-pulse p-8 text-center text-sm text-muted-foreground">Building evidence timeline…</div>}
        {!loading && !result && <div className="panel p-8 text-center text-sm text-muted-foreground">Run a research query to build a chronological evidence view.</div>}
        {result?.ok && <>
          <div className="grid gap-4 sm:grid-cols-3"><div className="panel p-4"><p className="text-xs text-muted-foreground">Confidence</p><p className="text-2xl font-black">{result.data.confidence}%</p></div><div className="panel p-4"><p className="text-xs text-muted-foreground">Evidence events</p><p className="text-2xl font-black">{events.length}</p></div><div className="panel p-4"><p className="text-xs text-muted-foreground">Sources</p><p className="text-2xl font-black">{result.data.sources.length}</p></div></div>
          <section className="panel p-5"><h2 className="font-bold">Executive Summary</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{result.data.summary}</p></section>
          <section className="space-y-3">{events.length ? events.map((event: any, index: number) => <article key={`${event.date ?? "event"}-${index}`} className="panel relative p-4 sm:ml-4 sm:border-l-2"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-border px-2 py-1 text-xs font-semibold">{event.date ?? "Undated"}</span><h2 className="font-bold">{event.title ?? event.event ?? `Evidence ${index + 1}`}</h2></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{event.description ?? event.summary ?? "Evidence detail unavailable."}</p>{event.source && <a href={event.source.url ?? event.source} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary underline">Source</a>}</article>) : <div className="panel p-6 text-sm text-muted-foreground">No timeline events were returned for this query.</div>}</section>
        </>}
        {result && !result.ok && <div className="panel p-5 text-sm text-destructive">{result.error.message}</div>}
      </div>
    </main>
  );
}
