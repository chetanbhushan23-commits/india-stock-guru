import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { buildResearchPlan } from "@/lib/ai-research-intelligence";

export const Route = createFileRoute("/research-intelligence")({ component: ResearchIntelligencePage });

function ResearchIntelligencePage() {
  const [question, setQuestion] = useState("");
  const plan = question.trim() ? buildResearchPlan(question) : null;

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Phase 11.0–11.10</p>
          <h1 className="text-3xl font-black">AI Research Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">Evidence-first research planning, quality, scenarios, risks and decision support.</p>
        </header>
        <section className="grid gap-4 md:grid-cols-3">
          {["Research Planning", "Evidence & Conflicts", "Quality & Confidence"].map((title) => (
            <article key={title} className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-bold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">Ready for evidence-backed research workflows.</p>
            </article>
          ))}
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <label htmlFor="research-question" className="text-sm font-semibold">Research question</label>
          <textarea id="research-question" value={question} onChange={(e) => setQuestion(e.target.value)} className="mt-3 min-h-28 w-full rounded-xl border border-border bg-background p-3 outline-none" placeholder="What do you want to research?" />
          {plan && (
            <div className="mt-4 rounded-xl border border-border p-4">
              <h3 className="font-semibold">Research Plan</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                {plan.tasks.map((task) => <li key={task}>{task}</li>)}
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
