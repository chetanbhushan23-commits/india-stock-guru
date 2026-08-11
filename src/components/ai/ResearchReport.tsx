import { useState } from "react";
import { Clipboard, Download, FileText, RefreshCw } from "lucide-react";
import { askAI } from "@/lib/ai.functions";
import type { AIReasoningResult } from "@/lib/ai/ai-types";

function markdown(result: AIReasoningResult) {
  if (!result.ok) return `# Research Report\n\n${result.error.message}`;
  const d = result.data;
  const section = (title: string, claims: { statement: string }[]) => `## ${title}\n\n${claims.length ? claims.map(c => `- ${c.statement}`).join("\n") : "No verified evidence supplied."}`;
  return [`# ${d.symbols.join(", ")} Research Report`, `\n${d.summary}`, section("Technical Analysis", d.technicalEvidence), section("Fundamental Analysis", d.fundamentalEvidence), section("News Analysis", d.newsEvidence), section("Corporate Actions", d.corporateEvents), section("Risks", d.risks), `## Missing Information\n\n${d.missingInformation.length ? d.missingInformation.map(x => `- ${x}`).join("\n") : "None reported."}`, `## Confidence\n\n${d.confidence}%`, `## Sources\n\n${d.sources.map(s => `- ${s.name}${s.url ? ` — ${s.url}` : ""}`).join("\n")}`].join("\n\n");
}

export function ResearchReport({ symbol = "INFY" }: { symbol?: string }) {
  const [question, setQuestion] = useState(`Create a complete evidence-backed research report for ${symbol}`);
  const [result, setResult] = useState<AIReasoningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const run = async () => { setLoading(true); try { setResult(await askAI({ data: { question, symbols: [symbol] } })); } finally { setLoading(false); } };
  const exportMarkdown = () => { if (!result) return; const blob = new Blob([markdown(result)], { type: "text/markdown;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${symbol}-research-report.md`; a.click(); URL.revokeObjectURL(url); };
  const print = () => window.print();
  const copy = async () => { if (result) await navigator.clipboard.writeText(markdown(result)); };

  return <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 print:bg-white print:text-black">
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="panel flex flex-wrap items-center justify-between gap-3 p-4 print:border-0 print:shadow-none">
        <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Phase 6.9</p><h1 className="text-2xl font-black">Research Report</h1><p className="text-sm text-muted-foreground">Verified evidence, structured through the existing AI reasoning boundary.</p></div>
        <div className="flex gap-2 print:hidden"><button onClick={copy} disabled={!result} className="rounded-xl border border-border p-2" aria-label="Copy report"><Clipboard/></button><button onClick={exportMarkdown} disabled={!result} className="rounded-xl border border-border p-2" aria-label="Export markdown"><Download/></button><button onClick={print} disabled={!result} className="rounded-xl border border-border p-2" aria-label="Print report"><FileText/></button><button onClick={() => void run()} disabled={loading} className="rounded-xl border border-border p-2" aria-label="Refresh report"><RefreshCw className={loading ? "animate-spin" : ""}/></button></div>
      </header>
      <section className="panel p-4 print:hidden"><div className="flex flex-col gap-2 sm:flex-row"><input value={question} onChange={e => setQuestion(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2"/><button onClick={() => void run()} disabled={loading} className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground">{loading ? "Generating…" : "Generate Report"}</button></div></section>
      {!result && <div className="panel p-10 text-center text-sm text-muted-foreground">Generate a report to assemble the current verified evidence through <code>askAI()</code>.</div>}
      {result && result.ok && <article className="panel space-y-6 p-5 print:border-0 print:shadow-none">
        <div><div className="text-sm text-muted-foreground">{result.data.symbols.join(" · ")} · {result.data.intent}</div><h2 className="mt-1 text-2xl font-black">{result.data.summary}</h2><div className="mt-3 inline-flex rounded-full border border-border px-3 py-1 text-sm font-semibold">Confidence {result.data.confidence}%</div></div>
        {[["Technical Analysis", result.data.technicalEvidence],["Fundamental Analysis", result.data.fundamentalEvidence],["News Analysis", result.data.newsEvidence],["Corporate Actions", result.data.corporateEvents],["Risks", result.data.risks]].map(([title, claims]) => <section key={title as string}><h3 className="text-lg font-bold">{title as string}</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6">{(claims as { statement: string }[]).map(c => <li key={c.statement}>{c.statement}</li>)}</ul></section>)}
        <section><h3 className="text-lg font-bold">Missing Information</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{result.data.missingInformation.map(x => <li key={x}>{x}</li>)}</ul></section>
        <section><h3 className="text-lg font-bold">Sources</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{result.data.sources.map(s => <a key={s.id} href={s.url ?? undefined} target="_blank" rel="noreferrer" className="rounded-xl border border-border p-3 text-sm hover:bg-surface-2"><b>{s.name}</b><div className="text-xs text-muted-foreground">{s.domain}</div></a>)}</div></section>
      </article>}
      {result && !result.ok && <div className="panel p-5 text-sm text-destructive">{result.error.message}</div>}
    </div>
  </main>;
}
