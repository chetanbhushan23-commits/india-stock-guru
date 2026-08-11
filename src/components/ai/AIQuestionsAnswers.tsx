import { useEffect, useMemo, useState } from "react";
import { askAI } from "@/lib/ai.functions";
import type { AIAnswer } from "@/lib/ai/ai-types";
import { addQAHistory, confidenceLabel, loadQAHistory, qualityScore, saveQAHistory, type QAHistoryItem } from "@/lib/ai/qa-intelligence";

const prompts = [
  "Reliance Industries ka current trend kya hai?",
  "Infosys ke technical aur fundamental risks kya hain?",
  "TCS aur Infosys mein kaunsa stronger hai?",
  "HDFC Bank long term ke liye kaisa hai?",
];

function Claims({ claims }: { claims: { statement: string; evidenceIds: string[] }[] }) {
  if (!claims.length) return <p className="text-sm text-muted-foreground">No verified evidence available for this section.</p>;
  return <ul className="space-y-2">{claims.map((claim, index) => <li key={`${claim.statement}-${index}`} className="rounded-lg border border-border/70 bg-background/50 p-3 text-sm leading-6"><span>{claim.statement}</span>{claim.evidenceIds.length > 0 && <span className="ml-2 text-[10px] text-muted-foreground">Evidence: {claim.evidenceIds.join(", ")}</span>}</li>)}</ul>;
}

export function AIQuestionsAnswers() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AIAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QAHistoryItem[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => setHistory(loadQAHistory()), []);

  const score = useMemo(() => answer ? qualityScore(answer) : 0, [answer]);

  async function submit(nextQuestion = question) {
    const text = nextQuestion.trim();
    if (!text || loading) return;
    setQuestion(text);
    setLoading(true);
    setError("");
    try {
      const result = await askAI({ data: { question: text } });
      if (!result.ok) {
        setAnswer(null);
        setError(result.error.message);
        return;
      }
      setAnswer(result.data);
      setHistory((current) => addQAHistory(result.data, current));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate an answer.");
    } finally {
      setLoading(false);
    }
  }

  function pin(id: string) {
    const next = history.map((item) => item.id === id ? { ...item, pinned: !item.pinned } : item);
    setHistory(next);
    saveQAHistory(next);
  }

  function openHistory(item: QAHistoryItem) {
    setSelectedHistory(item.id);
    setAnswer(item.answer);
    setQuestion(item.question);
  }

  function copyAnswer() {
    if (!answer) return;
    const text = [answer.summary, ...answerSectionsForCopy(answer)].join("\n\n");
    void navigator.clipboard?.writeText(text);
  }

  function exportMarkdown() {
    if (!answer) return;
    const lines = [`# AI Research: ${answer.question}`, "", `## Executive Summary`, answer.summary, "", `## Confidence`, `${answer.confidence}/100 (${confidenceLabel(answer.confidence)})`, ...answerSectionsForCopy(answer)];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ai-research.md"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-background px-3 py-4 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1500px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <div className="mb-4"><p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Phase 9.1–9.10</p><h1 className="text-lg font-bold">AI Questions &amp; Answers</h1></div>
          <button onClick={() => { setAnswer(null); setQuestion(""); setError(""); setSelectedHistory(null); }} className="mb-4 w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold">+ New Question</button>
          <div className="space-y-2">{history.length === 0 && <p className="text-xs text-muted-foreground">No questions yet.</p>}{history.map((item) => <div key={item.id} className={`rounded-xl border p-2 ${selectedHistory === item.id ? "border-primary" : "border-border"}`}><button onClick={() => openHistory(item)} className="w-full text-left text-xs leading-5">{item.pinned ? "📌 " : ""}{item.question}</button><button onClick={() => pin(item.id)} className="mt-1 text-[10px] text-muted-foreground">{item.pinned ? "Unpin" : "Pin"}</button></div>)}</div>
        </aside>

        <section className="min-w-0 space-y-4">
          <header className="rounded-2xl border border-border bg-card p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-muted-foreground">Evidence-backed research</p><h2 className="text-2xl font-black">Ask AI about Indian stocks</h2></div>{answer && <div className="rounded-xl bg-muted px-4 py-2 text-sm">Confidence <b>{answer.confidence}/100</b></div>}</div></header>

          <section className="rounded-2xl border border-border bg-card p-3 sm:p-4"><textarea value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void submit(); }} className="min-h-24 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-1" placeholder="Ask a stock-market question…" aria-label="AI question" /><div className="mt-3 flex flex-wrap justify-between gap-2"><div className="flex flex-wrap gap-2">{prompts.slice(0, 2).map((prompt) => <button key={prompt} onClick={() => void submit(prompt)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground">{prompt}</button>)}</div><button onClick={() => void submit()} disabled={loading || !question.trim()} className="rounded-xl border border-border px-5 py-2 font-semibold disabled:opacity-50">{loading ? "Researching evidence…" : "Ask AI"}</button></div></section>

          {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</div>}

          {!answer && !loading && <section className="rounded-2xl border border-dashed border-border p-8 text-center"><p className="font-semibold">Start with a market question</p><p className="mt-1 text-sm text-muted-foreground">The answer is produced only through the AI reasoning layer and verified research context.</p></section>}
          {loading && <section className="rounded-2xl border border-border bg-card p-6"><p className="font-semibold">Researching…</p><p className="mt-1 text-sm text-muted-foreground">Understanding the question, selecting evidence and validating the answer.</p></section>}

          {answer && <article className="space-y-3">
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Executive Summary</h3><span className="rounded-full bg-muted px-3 py-1 text-xs">Quality {score}/100 · {confidenceLabel(answer.confidence)} confidence</span></div><p className="text-sm leading-7">{answer.summary || "Insufficient verified evidence to answer confidently."}</p></section>
            <section className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl border border-border bg-card p-4"><h3 className="mb-3 font-bold">Technical Analysis</h3><Claims claims={answer.technicalEvidence} /></div><div className="rounded-2xl border border-border bg-card p-4"><h3 className="mb-3 font-bold">Fundamental Analysis</h3><Claims claims={answer.fundamentalEvidence} /></div><div className="rounded-2xl border border-border bg-card p-4"><h3 className="mb-3 font-bold">News Analysis</h3><Claims claims={answer.newsEvidence} /></div><div className="rounded-2xl border border-border bg-card p-4"><h3 className="mb-3 font-bold">Corporate Actions</h3><Claims claims={answer.corporateEvents} /></div></section>
            <section className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl border border-border bg-card p-4"><h3 className="mb-3 font-bold">Risks</h3><Claims claims={answer.risks} /></div><div className="rounded-2xl border border-border bg-card p-4"><h3 className="mb-3 font-bold">Missing Information</h3>{answer.missingInformation.length ? <ul className="list-disc space-y-2 pl-5 text-sm">{answer.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="text-sm text-muted-foreground">No material gaps reported.</p>}</div></section>
            <section className="rounded-2xl border border-border bg-card p-4"><h3 className="mb-3 font-bold">Sources</h3>{answer.sources.length ? <div className="grid gap-2 sm:grid-cols-2">{answer.sources.map((source) => <a key={source.id} href={source.url ?? "#"} target="_blank" rel="noreferrer" className="rounded-xl border border-border p-3 text-sm hover:bg-muted"><b>{source.name}</b><span className="block text-xs text-muted-foreground">{source.domain}{source.observedAt ? ` · ${source.observedAt}` : ""}</span></a>)}</div> : <p className="text-sm text-muted-foreground">No verified sources available.</p>}</section>
            <section className="rounded-2xl border border-border bg-card p-4"><h3 className="mb-3 font-bold">Evidence Timeline</h3>{answer.insufficient ? <p className="text-sm text-muted-foreground">Timeline unavailable because verified evidence is insufficient.</p> : <div className="space-y-2 text-sm"><p>Research generated: {new Date(answer.generatedAt).toLocaleString()}</p><p>{answer.sources.length} verified source(s) available for this answer.</p></div>}</section>
            <div className="flex flex-wrap gap-2"><button onClick={copyAnswer} className="rounded-xl border border-border px-3 py-2 text-sm">Copy Answer</button><button onClick={exportMarkdown} className="rounded-xl border border-border px-3 py-2 text-sm">Export Markdown</button><button onClick={() => void submit(answer.question)} className="rounded-xl border border-border px-3 py-2 text-sm">Regenerate</button></div>
          </article>}
        </section>
      </div>
    </main>
  );
}

function answerSectionsForCopy(answer: AIAnswer): string[] {
  return [
    `## Technical Analysis\n${answer.technicalEvidence.map((x) => `- ${x.statement}`).join("\n")}`,
    `## Fundamental Analysis\n${answer.fundamentalEvidence.map((x) => `- ${x.statement}`).join("\n")}`,
    `## News Analysis\n${answer.newsEvidence.map((x) => `- ${x.statement}`).join("\n")}`,
    `## Corporate Actions\n${answer.corporateEvents.map((x) => `- ${x.statement}`).join("\n")}`,
    `## Risks\n${answer.risks.map((x) => `- ${x.statement}`).join("\n")}`,
    `## Missing Information\n${answer.missingInformation.map((x) => `- ${x}`).join("\n")}`,
    `## Sources\n${answer.sources.map((x) => `- ${x.name}: ${x.url ?? ""}`).join("\n")}`,
  ];
}
