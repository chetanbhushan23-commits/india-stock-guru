import { useState } from "react";
import { askAI } from "@/lib/ai.functions";

const sections = [
  "Executive Summary",
  "Technical Analysis",
  "Fundamental Analysis",
  "News Analysis",
  "Corporate Actions",
  "Risks",
  "Missing Information",
  "Confidence Score",
  "Sources",
  "Evidence Timeline",
];

export function AIQuestionsAnswers() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!question.trim() || loading) return;
    setLoading(true);
    setAnswer("");
    try {
      const result = await askAI({ data: { question: question.trim() } });
      setAnswer(result.ok ? result.data.summary : result.error.message);
    } catch (error) {
      setAnswer(error instanceof Error ? error.message : "Unable to generate an answer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="panel p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Phase 9.0–9.10</p>
          <h1 className="text-2xl font-black">AI Questions &amp; Answers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Evidence-backed market research assistant. Answers are generated through the AI layer only.</p>
        </header>

        <section className="panel p-4">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void submit(); }}
            className="min-h-28 w-full resize-y rounded-xl border border-border bg-background p-3 outline-none"
            placeholder="Ask a stock-market question…"
            aria-label="AI question"
          />
          <div className="mt-3 flex justify-end">
            <button onClick={() => void submit()} disabled={loading || !question.trim()} className="rounded-xl border border-border px-5 py-2 font-semibold disabled:opacity-50">
              {loading ? "Researching…" : "Ask AI"}
            </button>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="font-bold">Answer Quality Framework</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => <div key={section} className="rounded-xl border border-border p-3 text-sm">{section}</div>)}
          </div>
        </section>

        {answer && (
          <section className="panel p-5">
            <h2 className="font-bold">AI Answer</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{answer}</p>
          </section>
        )}
      </div>
    </main>
  );
}
