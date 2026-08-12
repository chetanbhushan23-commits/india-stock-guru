import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  FileText,
  LineChart,
  Newspaper,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
  XCircle,
} from "lucide-react";
import { askAI } from "@/lib/ai.functions";
import type { AIAnswer } from "@/lib/ai/ai-types";
import {
  addQAHistory,
  confidenceLabel,
  loadQAHistory,
  qualityScore,
  saveQAHistory,
  type QAHistoryItem,
} from "@/lib/ai/qa-intelligence";

const prompts = [
  "Reliance ka current trend kya hai?",
  "Infosys ke technical aur fundamental risks kya hain?",
  "TCS aur Infosys mein kaunsa stronger hai?",
  "HDFC Bank long term ke liye kaisa hai?",
];

const researchTabs = [
  { id: "overview", label: "Overview", icon: BrainCircuit },
  { id: "technical", label: "Technical", icon: LineChart },
  { id: "fundamental", label: "Fundamental", icon: BarChart3 },
  { id: "news", label: "News", icon: Newspaper },
  { id: "risks", label: "Risks", icon: AlertTriangle },
  { id: "sources", label: "Sources", icon: BookOpen },
] as const;

type ResearchTab = (typeof researchTabs)[number]["id"];

function Claims({ claims }: { claims: { statement: string; evidenceIds: string[] }[] }) {
  if (!claims.length) {
    return <p className="text-sm text-muted-foreground">No verified evidence available for this section.</p>;
  }

  return (
    <div className="space-y-2">
      {claims.map((claim, index) => (
        <div
          key={`${claim.statement}-${index}`}
          className="rounded-xl border border-border/70 bg-background/50 p-3 text-sm leading-6"
        >
          <div className="flex gap-2">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
            <div>
              <span>{claim.statement}</span>
              {claim.evidenceIds.length > 0 && (
                <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Evidence: {claim.evidenceIds.join(", ")}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Activity;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-bold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function AIQuestionsAnswers() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AIAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QAHistoryItem[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ResearchTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => setHistory(loadQAHistory()), []);
  const score = useMemo(() => (answer ? qualityScore(answer) : 0), [answer]);

  async function submit(nextQuestion = question) {
    const text = nextQuestion.trim();
    if (!text || loading) return;
    setQuestion(text);
    setLoading(true);
    setError("");
    setActiveTab("overview");
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

  function newQuestion() {
    setAnswer(null);
    setQuestion("");
    setError("");
    setSelectedHistory(null);
    setActiveTab("overview");
  }

  function pin(id: string) {
    const next = history.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item));
    setHistory(next);
    saveQAHistory(next);
  }

  function openHistory(item: QAHistoryItem) {
    setSelectedHistory(item.id);
    setAnswer(item.answer);
    setQuestion(item.question);
    setError("");
    setActiveTab("overview");
  }

  function copyAnswer() {
    if (!answer) return;
    void navigator.clipboard?.writeText([answer.summary, ...answerSectionsForCopy(answer)].join("\n\n"));
  }

  function exportMarkdown() {
    if (!answer) return;
    const lines = [
      `# ChetanMarkets AI Research: ${answer.question}`,
      "",
      "## Executive Summary",
      answer.summary,
      "",
      "## Confidence",
      `${answer.confidence}/100 (${confidenceLabel(answer.confidence)})`,
      ...answerSectionsForCopy(answer),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chetanmarkets-ai-research.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setSidebarOpen((value) => !value)}
            className="rounded-xl border border-border p-2 text-muted-foreground hover:text-foreground"
            aria-label="Toggle research history"
          >
            <Activity className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-primary p-2 text-primary-foreground shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-tight">ChetanMarkets AI</p>
              <p className="truncate text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Grounded Research Terminal</p>
            </div>
          </div>
          <div className="ml-auto hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-500 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Evidence engine ready
          </div>
          <button onClick={newQuestion} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
            + New research
          </button>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)] w-full">
        {sidebarOpen && (
          <aside className="hidden w-72 shrink-0 border-r border-border bg-card/60 p-4 lg:block">
            <div className="mb-5 flex items-center gap-2 px-2">
              <Clock3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Research history</span>
            </div>
            <div className="space-y-2 overflow-y-auto lg:max-h-[calc(100vh-8rem)]">
              {history.length === 0 && <p className="px-2 text-xs text-muted-foreground">Your saved questions will appear here.</p>}
              {history.map((item) => (
                <div
                  key={item.id}
                  className={`group rounded-xl border p-2 transition ${selectedHistory === item.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60"}`}
                >
                  <button onClick={() => openHistory(item)} className="w-full text-left text-xs leading-5">
                    {item.question}
                  </button>
                  <button onClick={() => pin(item.id)} className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                    {item.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                    {item.pinned ? "Unpin" : "Pin"}
                  </button>
                </div>
              ))}
            </div>
          </aside>
        )}

        <section className="min-w-0 flex-1 px-3 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1800px] space-y-4">
            <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
              <div className="relative p-5 sm:p-7 lg:p-9">
                <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">AI Q&amp;A · Core Workspace</span>
                    {answer && <span className="rounded-full border border-border px-3 py-1 text-[10px] text-muted-foreground">Quality {score}/100</span>}
                  </div>
                  <h1 className="max-w-4xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Ask any question about an NSE or BSE stock.</h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">ChetanMarkets AI researches technicals, fundamentals, corporate events, news and source evidence before answering. It should explain what is known, what conflicts and what is missing.</p>

                  <div className="mt-6 rounded-2xl border border-border bg-background p-3 shadow-inner sm:p-4">
                    <div className="flex gap-3">
                      <Search className="mt-3 h-5 w-5 shrink-0 text-muted-foreground" />
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void submit(); }}
                        className="min-h-24 flex-1 resize-none bg-transparent p-2 text-base outline-none placeholder:text-muted-foreground"
                        placeholder="Example: Reliance ka current trend, valuation, risks aur latest news kya keh rahi hai?"
                        aria-label="AI research question"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                      <div className="flex flex-wrap gap-2">
                        {prompts.map((prompt) => <button key={prompt} onClick={() => void submit(prompt)} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">{prompt}</button>)}
                      </div>
                      <button onClick={() => void submit()} disabled={loading || !question.trim()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg disabled:cursor-not-allowed disabled:opacity-50">
                        <Sparkles className="h-4 w-4" /> {loading ? "Researching…" : "Research & Answer"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {error && <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm"><XCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><b>Research request failed</b><p className="mt-1 text-muted-foreground">{error}</p></div></div>}

            {loading && <section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center gap-3"><RefreshCw className="h-5 w-5 animate-spin text-primary" /><div><p className="font-bold">Building grounded research…</p><p className="text-sm text-muted-foreground">Resolving the stock, collecting evidence and validating the answer.</p></div></div></section>}

            {answer && !loading && (
              <>
                <nav className="sticky top-20 z-20 overflow-x-auto rounded-2xl border border-border bg-card/95 p-1.5 shadow-lg backdrop-blur">
                  <div className="flex min-w-max gap-1">
                    {researchTabs.map(({ id, label, icon: Icon }) => (
                      <button key={id} onClick={() => setActiveTab(id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeTab === id ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                        <Icon className="h-4 w-4" /> {label}
                      </button>
                    ))}
                  </div>
                </nav>

                {activeTab === "overview" && <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.7fr)]"><div className="space-y-4"><SectionCard title="Executive Summary" icon={BrainCircuit}><p className="text-base leading-8">{answer.summary || "Insufficient verified evidence to answer confidently."}</p></SectionCard><div className="grid gap-4 md:grid-cols-2"><SectionCard title="Technical Analysis" icon={LineChart}><Claims claims={answer.technicalEvidence} /></SectionCard><SectionCard title="Fundamental Analysis" icon={BarChart3}><Claims claims={answer.fundamentalEvidence} /></SectionCard><SectionCard title="News & Sentiment" icon={Newspaper}><Claims claims={answer.newsEvidence} /></SectionCard><SectionCard title="Corporate Events" icon={Building2}><Claims claims={answer.corporateEvents} /></SectionCard></div></div><div className="space-y-4"><SectionCard title="Trust & Confidence" icon={ShieldCheck}><div className="text-center"><div className="text-5xl font-black">{answer.confidence}</div><p className="mt-1 text-sm text-muted-foreground">{confidenceLabel(answer.confidence)} confidence</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, answer.confidence))}%` }} /></div></div></SectionCard><SectionCard title="Research Snapshot" icon={Activity}><div className="grid grid-cols-2 gap-2 text-sm"><div className="rounded-xl bg-muted p-3"><b>{answer.sources.length}</b><span className="block text-xs text-muted-foreground">Sources</span></div><div className="rounded-xl bg-muted p-3"><b>{answer.technicalEvidence.length}</b><span className="block text-xs text-muted-foreground">Technical claims</span></div><div className="rounded-xl bg-muted p-3"><b>{answer.fundamentalEvidence.length}</b><span className="block text-xs text-muted-foreground">Fundamental claims</span></div><div className="rounded-xl bg-muted p-3"><b>{answer.risks.length}</b><span className="block text-xs text-muted-foreground">Risk flags</span></div></div></SectionCard><SectionCard title="Risks & Gaps" icon={AlertTriangle}>{answer.risks.length ? <Claims claims={answer.risks} /> : <p className="text-sm text-muted-foreground">No material risk evidence returned.</p>}{answer.missingInformation.length > 0 && <div className="mt-4 border-t border-border pt-4"><p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Missing information</p><ul className="space-y-1 text-sm">{answer.missingInformation.map((item) => <li key={item}>• {item}</li>)}</ul></div>}</SectionCard></div></div>}

                {activeTab === "technical" && <div className="grid gap-4 lg:grid-cols-2"><SectionCard title="Technical Analysis" icon={LineChart}><Claims claims={answer.technicalEvidence} /></SectionCard><SectionCard title="Trend & Swing Risks" icon={TrendingUp}><Claims claims={answer.risks} /></SectionCard></div>}
                {activeTab === "fundamental" && <div className="grid gap-4 lg:grid-cols-2"><SectionCard title="Fundamental Analysis" icon={BarChart3}><Claims claims={answer.fundamentalEvidence} /></SectionCard><SectionCard title="Corporate Actions" icon={Building2}><Claims claims={answer.corporateEvents} /></SectionCard></div>}
                {activeTab === "news" && <SectionCard title="News & Sentiment" icon={Newspaper}><Claims claims={answer.newsEvidence} /></SectionCard>}
                {activeTab === "risks" && <div className="grid gap-4 lg:grid-cols-2"><SectionCard title="Risk Flags" icon={AlertTriangle}><Claims claims={answer.risks} /></SectionCard><SectionCard title="Missing Information" icon={FileText}>{answer.missingInformation.length ? <ul className="space-y-2 text-sm">{answer.missingInformation.map((item) => <li key={item} className="rounded-xl border border-border p-3">{item}</li>)}</ul> : <p className="text-sm text-muted-foreground">No material gaps reported.</p>}</SectionCard></div>}
                {activeTab === "sources" && <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"><SectionCard title="Verified Sources" icon={BookOpen}>{answer.sources.length ? <div className="grid gap-3 sm:grid-cols-2">{answer.sources.map((source) => <a key={source.id} href={source.url ?? "#"} target="_blank" rel="noreferrer" className="group rounded-xl border border-border p-4 hover:border-primary/50 hover:bg-muted"><div className="flex items-start justify-between gap-3"><div><b>{source.name}</b><span className="mt-1 block text-xs text-muted-foreground">{source.domain}</span>{source.observedAt && <span className="mt-1 block text-[10px] text-muted-foreground">Observed: {source.observedAt}</span>}</div><ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1" /></div></a>)}</div> : <p className="text-sm text-muted-foreground">No verified sources available.</p>}</SectionCard><SectionCard title="Evidence Status" icon={ShieldCheck}><p className="text-sm leading-6">Claims shown in this workspace are tied to evidence IDs returned by the grounded research pipeline. Missing evidence is surfaced instead of being invented.</p></SectionCard></div>}

                <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Generated {new Date(answer.generatedAt).toLocaleString()}</p><div className="flex flex-wrap gap-2"><button onClick={copyAnswer} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"><Copy className="h-4 w-4" /> Copy</button><button onClick={exportMarkdown} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"><Download className="h-4 w-4" /> Export</button><button onClick={() => void submit(answer.question)} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"><RefreshCw className="h-4 w-4" /> Regenerate</button></div></footer>
              </>
            )}

            {!answer && !loading && !error && <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl border border-border bg-card p-5"><BrainCircuit className="h-6 w-6 text-primary" /><h3 className="mt-4 font-bold">Grounded AI</h3><p className="mt-1 text-sm text-muted-foreground">Answers are built from the research context, not guesses.</p></div><div className="rounded-2xl border border-border bg-card p-5"><LineChart className="h-6 w-6 text-primary" /><h3 className="mt-4 font-bold">Technical</h3><p className="mt-1 text-sm text-muted-foreground">Trend, momentum and swing evidence in one place.</p></div><div className="rounded-2xl border border-border bg-card p-5"><ShieldCheck className="h-6 w-6 text-primary" /><h3 className="mt-4 font-bold">Evidence</h3><p className="mt-1 text-sm text-muted-foreground">Sources, timestamps, confidence and missing data stay visible.</p></div><div className="rounded-2xl border border-border bg-card p-5"><WalletCards className="h-6 w-6 text-primary" /><h3 className="mt-4 font-bold">Research History</h3><p className="mt-1 text-sm text-muted-foreground">Pin, reopen, copy and export previous questions.</p></div></section>}
          </div>
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
