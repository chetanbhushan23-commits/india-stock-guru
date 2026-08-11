import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { askAI } from "@/lib/ai.functions";
import type { AIReasoningResult } from "@/lib/ai/ai-types";
import { evidenceCoverage, flattenEvidence, sourceDomains } from "@/lib/ai/evidence-explorer";

export function EvidenceExplorer({ symbol = "INFY" }: { symbol?: string }) {
  const [query, setQuery] = useState("Explain the latest movement with verified evidence");
  const [result, setResult] = useState<AIReasoningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All");

  const run = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    try { setResult(await askAI({ data: { question: query, symbols: [symbol] } })); }
    finally { setLoading(false); }
  };

  const items = useMemo(() => {
    if (!result?.ok) return [];
    return flattenEvidence(result.data).filter((item) => filter === "All" || item.section === filter);
  }, [result, filter]);

  const sections = result?.ok ? ["All", ...new Set(flattenEvidence(result.data).map((x) => x.section))] : ["All"];
  const domains = result?.ok ? sourceDomains(result.data) : [];

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="panel p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Phase 6.5</p>
          <h1 className="text-2xl font-black">{symbol} Evidence Explorer</h1>
          <p className="mt-1 text-sm text-muted-foreground">Inspect the evidence behind every AI claim. The UI uses only askAI().</p>
        </header>
        <section className="panel p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void run(); }} className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3"/></div>
            <button onClick={() => void run()} disabled={loading} className="rounded-xl bg-primary px-5 py-2 font-semibold text-primary-foreground">{loading ? "Verifying…" : "Analyze Evidence"}</button>
          </div>
        </section>
        {result?.ok && <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="panel p-4"><p className="text-xs text-muted-foreground">Evidence coverage</p><p className="text-2xl font-black">{evidenceCoverage(result.data)}%</p></div>
            <div className="panel p-4"><p className="text-xs text-muted-foreground">Confidence</p><p className="text-2xl font-black">{result.data.confidence}%</p></div>
            <div className="panel p-4"><p className="text-xs text-muted-foreground">Verified sources</p><p className="text-2xl font-black">{result.data.sources.length}</p></div>
          </section>
          <section className="panel p-4"><div className="flex flex-wrap gap-2">{sections.map(s => <button key={s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1.5 text-xs ${filter === s ? "border-primary bg-primary/10" : "border-border text-muted-foreground"}`}>{s}</button>)}</div></section>
          <section className="grid gap-4 lg:grid-cols-2">
            {items.map((item, index) => <article key={`${item.claim.statement}-${index}`} className="panel p-4">
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-primary">{item.section}</span><span className="rounded-full border border-border px-2 py-0.5 text-[11px]">{item.sources.length ? `${item.sources.length} source${item.sources.length === 1 ? "" : "s"}` : "Unverified"}</span></div>
              <p className="mt-3 text-sm leading-6">{item.claim.statement}</p>
              {item.sources.length > 0 && <div className="mt-4 space-y-2">{item.sources.map(source => <a key={source.id} href={source.url ?? undefined} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-border p-3 text-xs hover:bg-surface-2"><span><b>{source.name}</b><span className="ml-2 text-muted-foreground">{source.domain}</span></span><ExternalLink className="h-3.5 w-3.5"/></a>)}</div>}
            </article>)}
          </section>
          <section className="panel p-4"><h2 className="font-bold">Source Timeline</h2><div className="mt-3 space-y-2">{result.data.sources.slice().sort((a,b) => (b.observedAt ?? "").localeCompare(a.observedAt ?? "")).map(source => <div key={source.id} className="flex items-center justify-between gap-3 border-b border-border py-2 text-xs"><span>{source.name}</span><span className="text-muted-foreground">{source.observedAt ? new Date(source.observedAt).toLocaleString() : "Date unavailable"}</span></div>)}</div><div className="mt-3 flex flex-wrap gap-2">{domains.map(d => <span key={d} className="rounded-full bg-surface-2 px-2 py-1 text-[11px]">{d}</span>)}</div></section>
        </>}
        {result && !result.ok && <div className="panel p-5 text-sm text-destructive">{result.error.message}</div>}
      </div>
    </main>
  );
}
