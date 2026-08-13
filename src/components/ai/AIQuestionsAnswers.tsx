import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
  Globe2,
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
  { id: "corporate", label: "Corporate", icon: Building2 },
  { id: "risks", label: "Risks", icon: AlertTriangle },
  { id: "sources", label: "Sources", icon: BookOpen },
] as const;

type ResearchTab = (typeof researchTabs)[number]["id"];
type Claim = { statement: string; evidenceIds: string[] };

function Claims({ claims }: { claims: Claim[] }) {
  if (!claims.length) {
    return <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">No verified evidence available for this section.</div>;
  }
  return <div className="space-y-2.5">{claims.map((claim, index) => <article key={`${claim.statement}-${index}`} className="rounded-xl border border-border/70 bg-background/60 p-3.5 sm:p-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><div className="min-w-0"><p className="text-sm leading-6 text-foreground">{claim.statement}</p>{claim.evidenceIds.length > 0 && <p className="mt-2 break-words text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Evidence · {claim.evidenceIds.join(", ")}</p>}</div></div></article>)}</div>;
}

function SectionCard({ title, icon: Icon, children, className = "" }: { title: string; icon: typeof Activity; children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 ${className}`}><div className="mb-4 flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div><h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3></div>{children}</section>;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl border border-border bg-background/60 px-3 py-3"><p className="text-lg font-black tabular-nums">{value}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p></div>;
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function researchStage(elapsedMs: number) {
  if (elapsedMs < 1500) return { label: "Resolving stock / symbol", detail: "Identifying NSE/BSE security and research intent." };
  if (elapsedMs < 4000) return { label: "Searching web sources", detail: "Checking configured market, company, filing and news sources." };
  if (elapsedMs < 7000) return { label: "Collecting latest evidence", detail: "Combining technical, fundamental, news and corporate evidence." };
  if (elapsedMs < 10000) return { label: "Gemini is researching", detail: "Gemini Search grounding is being used for fresh web information." };
  return { label: "Validating & summarising", detail: "Cross-checking evidence, dates and sources before the answer." };
}

export function AIQuestionsAnswers() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AIAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [researchStartedAt, setResearchStartedAt] = useState<number | null>(null);
  const [researchElapsed, setResearchElapsed] = useState(0);
  const [history, setHistory] = useState<QAHistoryItem[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ResearchTab>("overview");

  useEffect(() => {
    if (!loading || researchStartedAt === null) return;
    const timer = window.setInterval(() => setResearchElapsed(Date.now() - researchStartedAt), 100);
    return () => window.clearInterval(timer);
  }, [loading, researchStartedAt]);

  const score = useMemo(() => (answer ? qualityScore(answer) : 0), [answer]);
  const stage = researchStage(researchElapsed);

  async function submit(nextQuestion = question) {
    const text = nextQuestion.trim();
    if (!text || loading) return;
    setQuestion(text);
    setAnswer(null);
    setLoading(true);
    setError("");
    setActiveTab("overview");
    setResearchStartedAt(Date.now());
    setResearchElapsed(0);
    const started = Date.now();
    try {
      const result = await askAI({ data: { question: text } });
      const elapsed = Date.now() - started;
      setResearchElapsed(elapsed);
      if (!result.ok) { setError(result.error.message); return; }
      setAnswer(result.data);
      setHistory((current) => addQAHistory(result.data, current));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate an answer.");
    } finally {
      setLoading(false);
    }
  }

  function newQuestion() { setAnswer(null); setQuestion(""); setError(""); setActiveTab("overview"); setResearchStartedAt(null); setResearchElapsed(0); }
  function pin(id: string) { const next = history.map((item) => item.id === id ? { ...item, pinned: !item.pinned } : item); setHistory(next); saveQAHistory(next); }
  function openHistory(item: QAHistoryItem) { setSelectedHistory(item.id); setAnswer(item.answer); setQuestion(item.question); setError(""); setActiveTab("overview"); }
  function copyAnswer() { if (answer) void navigator.clipboard?.writeText([answer.summary, ...answerSectionsForCopy(answer)].join("\n\n")); }
  function exportMarkdown() {
    if (!answer) return;
    const lines = [`# ChetanMarkets AI Research: ${answer.question}`, "", "## Executive Summary", answer.summary, "", "## Confidence", `${answer.confidence}/100 (${confidenceLabel(answer.confidence)})`, ...answerSectionsForCopy(answer)];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "chetanmarkets-ai-research.md"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-[1900px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-primary p-2 text-primary-foreground shadow-lg"><Sparkles className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-sm font-black tracking-tight sm:text-base">ChetanMarkets AI</p><p className="truncate text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Grounded Indian Market Intelligence</p></div></div>
        <div className="ml-auto hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-500 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Evidence engine ready</div>
        <button onClick={newQuestion} className="rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-muted sm:text-sm">+ New research</button>
      </div></header>

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1900px]">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-card/30 p-4 lg:block xl:w-72"><div className="mb-5 flex items-center gap-2 px-1"><Clock3 className="h-4 w-4 text-primary" /><span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Research history</span></div><div className="space-y-2 overflow-y-auto lg:max-h-[calc(100vh-7rem)]">{history.length === 0 && <p className="px-1 text-xs leading-5 text-muted-foreground">Saved questions will appear here.</p>}{history.map((item) => <div key={item.id} className={`rounded-xl border p-3 transition ${selectedHistory === item.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}><button onClick={() => openHistory(item)} className="w-full text-left text-xs leading-5">{item.question}</button><button onClick={() => pin(item.id)} className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">{item.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}{item.pinned ? "Unpin" : "Pin"}</button></div>)}</div></aside>

        <section className="min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8"><div className="mx-auto w-full max-w-[1500px] space-y-5">
          <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl"><div className="relative p-5 sm:p-7 lg:p-8"><div className="pointer-events-none absolute right-0 top-0 h-52 w-52 rounded-full bg-primary/10 blur-3xl" /><div className="relative">
            <div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">AI Q&amp;A · Core Workspace</span>{answer && <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-semibold text-muted-foreground">Quality {score}/100</span>}</div>
            <h1 className="max-w-4xl text-2xl font-black tracking-tight sm:text-4xl lg:text-5xl">Ask. Research. Understand.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">Ask about any NSE or BSE stock. ChetanMarkets AI organizes technical, fundamental, news, corporate-action, risk and source evidence into an easy-to-read research answer.</p>
            <div className="mt-6 rounded-2xl border border-primary/20 bg-background p-3 shadow-inner sm:p-4"><div className="flex items-start gap-3"><Search className="mt-3 h-5 w-5 shrink-0 text-muted-foreground" /><textarea value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void submit(); }} className="min-h-20 flex-1 resize-none bg-transparent p-2 text-base leading-6 outline-none placeholder:text-muted-foreground sm:min-h-24" placeholder="Example: Reliance ka current trend, valuation, risks aur latest news kya keh rahi hai?" aria-label="AI research question" /><button onClick={() => void submit()} disabled={loading || !question.trim()} className="mt-1 inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">{loading ? "Researching…" : "Ask AI"}</span></button></div><div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">{prompts.map((prompt) => <button key={prompt} onClick={() => void submit(prompt)} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground">{prompt}</button>)}</div></div>
          </div></div></section>

          {error && <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm"><XCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><b>Research request failed</b><p className="mt-1 text-muted-foreground">{error}</p></div></div>}
          {loading && <section className="overflow-hidden rounded-2xl border border-primary/20 bg-card p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2"><RefreshCw className="h-5 w-5 animate-spin text-primary" /></div><div><p className="font-bold">{stage.label}</p><p className="mt-1 text-sm text-muted-foreground">{stage.detail}</p></div></div><div className="rounded-xl border border-border bg-background px-4 py-2 text-right"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Research time</p><p className="text-xl font-black tabular-nums text-primary">{formatElapsed(researchElapsed)}</p></div></div><div className="mt-5 grid gap-2 sm:grid-cols-5"><div className="rounded-xl border border-border bg-background/60 p-3"><p className="text-xs font-semibold">1. Resolve</p><p className="mt-1 text-[10px] text-muted-foreground">NSE / BSE symbol</p></div><div className="rounded-xl border border-border bg-background/60 p-3"><p className="text-xs font-semibold">2. Web search</p><p className="mt-1 text-[10px] text-muted-foreground">Market + company sources</p></div><div className="rounded-xl border border-border bg-background/60 p-3"><p className="text-xs font-semibold">3. Latest evidence</p><p className="mt-1 text-[10px] text-muted-foreground">News + filings</p></div><div className="rounded-xl border border-border bg-background/60 p-3"><p className="text-xs font-semibold">4. Gemini</p><p className="mt-1 text-[10px] text-muted-foreground">Search grounding</p></div><div className="rounded-xl border border-border bg-background/60 p-3"><p className="text-xs font-semibold">5. Verify</p><p className="mt-1 text-[10px] text-muted-foreground">Dates + evidence</p></div></div><div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground"><Globe2 className="h-4 w-4 text-primary" /> Research is checking configured web/market sources; verified source links will appear below when the research completes.</div></section>}

          {answer && !loading && <>
            <div className="grid gap-3 sm:grid-cols-4"><Stat label="Confidence" value={`${answer.confidence}/100`} /><Stat label="Verified sources" value={answer.sources.length} /><Stat label="Technical claims" value={answer.technicalEvidence.length} /><Stat label="Risk flags" value={answer.risks.length} /></div>
            <nav className="sticky top-[4.5rem] z-30 overflow-x-auto rounded-2xl border border-border bg-card/95 p-1.5 shadow-lg backdrop-blur"><div className="flex min-w-max gap-1">{researchTabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setActiveTab(id)} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition sm:px-4 sm:text-sm ${activeTab === id ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="h-4 w-4" />{label}</button>)}</div></nav>

            {activeTab === "overview" && <div className="space-y-5"><SectionCard title="Executive Summary" icon={BrainCircuit} className="border-primary/20"><p className="max-w-5xl text-base leading-8 sm:text-lg">{answer.summary || "Insufficient verified evidence to answer confidently."}</p><div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Evidence-backed answer · {confidenceLabel(answer.confidence)} confidence</div></SectionCard><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="grid gap-5 md:grid-cols-2"><SectionCard title="Technical Analysis" icon={LineChart}><Claims claims={answer.technicalEvidence} /></SectionCard><SectionCard title="Fundamental Analysis" icon={BarChart3}><Claims claims={answer.fundamentalEvidence} /></SectionCard><SectionCard title="News & Sentiment" icon={Newspaper}><Claims claims={answer.newsEvidence} /></SectionCard><SectionCard title="Corporate Actions" icon={Building2}><Claims claims={answer.corporateEvents} /></SectionCard></div><div className="space-y-5"><SectionCard title="Confidence" icon={ShieldCheck}><div className="flex items-end justify-between gap-3"><div><div className="text-5xl font-black tabular-nums">{answer.confidence}</div><p className="mt-1 text-sm text-muted-foreground">{confidenceLabel(answer.confidence)}</p></div><span className="text-xs text-muted-foreground">/100</span></div><div className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, answer.confidence))}%` }} /></div></SectionCard><SectionCard title="Research Snapshot" icon={Activity}><div className="grid grid-cols-2 gap-2"><Stat label="Sources" value={answer.sources.length} /><Stat label="Technical" value={answer.technicalEvidence.length} /><Stat label="Fundamental" value={answer.fundamentalEvidence.length} /><Stat label="Risks" value={answer.risks.length} /></div></SectionCard><SectionCard title="Risks & Gaps" icon={AlertTriangle}>{answer.risks.length ? <Claims claims={answer.risks} /> : <p className="text-sm text-muted-foreground">No material risk evidence returned.</p>}{answer.missingInformation.length > 0 && <div className="mt-4 border-t border-border pt-4"><p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Missing information</p><ul className="space-y-1 text-sm leading-6">{answer.missingInformation.map((item) => <li key={item}>• {item}</li>)}</ul></div>}</SectionCard></div></div></div>}
            {activeTab === "technical" && <div className="grid gap-5 lg:grid-cols-2"><SectionCard title="Technical Analysis" icon={LineChart}><Claims claims={answer.technicalEvidence} /></SectionCard><SectionCard title="Trend & Swing Risks" icon={TrendingUp}><Claims claims={answer.risks} /></SectionCard></div>}
            {activeTab === "fundamental" && <div className="grid gap-5 lg:grid-cols-2"><SectionCard title="Fundamental Analysis" icon={BarChart3}><Claims claims={answer.fundamentalEvidence} /></SectionCard><SectionCard title="Corporate Actions" icon={Building2}><Claims claims={answer.corporateEvents} /></SectionCard></div>}
            {activeTab === "news" && <SectionCard title="News & Sentiment" icon={Newspaper}><Claims claims={answer.newsEvidence} /></SectionCard>}
            {activeTab === "corporate" && <SectionCard title="Corporate Actions & Events" icon={Building2}><Claims claims={answer.corporateEvents} /></SectionCard>}
            {activeTab === "risks" && <div className="grid gap-5 lg:grid-cols-2"><SectionCard title="Risk Flags" icon={AlertTriangle}><Claims claims={answer.risks} /></SectionCard><SectionCard title="Missing Information" icon={FileText}>{answer.missingInformation.length ? <ul className="space-y-2 text-sm leading-6">{answer.missingInformation.map((item) => <li key={item} className="rounded-xl border border-border p-3">{item}</li>)}</ul> : <p className="text-sm text-muted-foreground">No material gaps reported.</p>}</SectionCard></div>}
            {activeTab === "sources" && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><SectionCard title="Verified Sources" icon={BookOpen}>{answer.sources.length ? <div className="grid gap-3 sm:grid-cols-2">{answer.sources.map((source) => <a key={source.id} href={source.url ?? "#"} target="_blank" rel="noreferrer" className="group rounded-xl border border-border p-4 hover:border-primary/50 hover:bg-muted"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="text-sm">{source.name}</b><span className="mt-1 block text-xs text-muted-foreground">{source.domain}</span>{source.observedAt && <span className="mt-1 block text-[10px] text-muted-foreground">Observed: {source.observedAt}</span>}</div><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1" /></div></a>)}</div> : <p className="text-sm text-muted-foreground">No verified sources available.</p>}</SectionCard><SectionCard title="Evidence Status" icon={ShieldCheck}><p className="text-sm leading-6 text-muted-foreground">Every displayed claim is tied to evidence returned by the grounded research pipeline. Missing evidence is shown instead of invented.</p></SectionCard></div>}
            <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Generated {new Date(answer.generatedAt).toLocaleString()} · Research completed in {formatElapsed(researchElapsed)}</p><div className="flex flex-wrap gap-2"><button onClick={copyAnswer} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"><Copy className="h-4 w-4" /> Copy</button><button onClick={exportMarkdown} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"><Download className="h-4 w-4" /> Export</button><button onClick={() => void submit(answer.question)} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"><RefreshCw className="h-4 w-4" /> Regenerate</button></div></footer>
          </>}

          {!answer && !loading && !error && <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><SectionCard title="Grounded AI" icon={BrainCircuit}><p className="text-sm leading-6 text-muted-foreground">Answers are built from verified research context, not guesses.</p></SectionCard><SectionCard title="Technical" icon={LineChart}><p className="text-sm leading-6 text-muted-foreground">Trend, momentum and swing evidence in one readable view.</p></SectionCard><SectionCard title="Evidence" icon={ShieldCheck}><p className="text-sm leading-6 text-muted-foreground">Sources, timestamps, confidence and missing data stay visible.</p></SectionCard><SectionCard title="History" icon={WalletCards}><p className="text-sm leading-6 text-muted-foreground">Pin, reopen, copy and export previous research.</p></SectionCard></section>}
        </div></section>
      </div>
    </main>
  );
}

function answerSectionsForCopy(answer: AIAnswer): string[] {
  return [`## Technical Analysis\n${answer.technicalEvidence.map((x) => `- ${x.statement}`).join("\n")}`, `## Fundamental Analysis\n${answer.fundamentalEvidence.map((x) => `- ${x.statement}`).join("\n")}`, `## News Analysis\n${answer.newsEvidence.map((x) => `- ${x.statement}`).join("\n")}`, `## Corporate Actions\n${answer.corporateEvents.map((x) => `- ${x.statement}`).join("\n")}`, `## Risks\n${answer.risks.map((x) => `- ${x.statement}`).join("\n")}`, `## Missing Information\n${answer.missingInformation.map((x) => `- ${x}`).join("\n")}`, `## Sources\n${answer.sources.map((x) => `- ${x.name}: ${x.url ?? ""}`).join("\n")}`];
}
