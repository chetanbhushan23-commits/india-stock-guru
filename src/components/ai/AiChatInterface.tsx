import { useEffect, useMemo, useRef, useState } from "react";
import { askAI } from "@/lib/ai.functions";
import type { AIAnswer } from "@/lib/ai/ai-types";
import {
  answerToMarkdown,
  copyAnswer,
  createConversation,
  downloadText,
  loadConversations,
  saveConversations,
  sourceLabel,
  SUGGESTED_PROMPTS,
  type ChatConversation,
  type ChatMessage,
} from "@/lib/ai-chat";
import {
  Bot,
  Check,
  Clipboard,
  ExternalLink,
  FileDown,
  FileText,
  Pin,
  PinOff,
  RefreshCw,
  Send,
  Square,
  Sparkles,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let list: string[] = [];
  let code: string[] = [];
  let inCode = false;

  const flushList = () => {
    if (!list.length) return;
    nodes.push(
      <ul key={`list-${nodes.length}`} className="my-2 list-disc space-y-1 pl-5 text-sm leading-6 text-foreground/90">
        {list.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
      </ul>,
    );
    list = [];
  };

  lines.forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        nodes.push(<pre key={`code-${index}`} className="my-3 overflow-x-auto rounded-xl border border-border bg-black/40 p-3 text-xs leading-5 text-foreground"><code>{code.join("\n")}</code></pre>);
        code = [];
      }
      inCode = !inCode;
      return;
    }
    if (inCode) { code.push(line); return; }
    if (line.startsWith("- ") || line.startsWith("* ")) { list.push(line.slice(2)); return; }
    flushList();
    if (!line.trim()) return;
    if (line.startsWith("### ")) nodes.push(<h4 key={index} className="mt-3 text-sm font-bold">{line.slice(4)}</h4>);
    else if (line.startsWith("## ")) nodes.push(<h3 key={index} className="mt-4 text-sm font-bold tracking-wide">{line.slice(3)}</h3>);
    else if (line.startsWith("# ")) nodes.push(<h2 key={index} className="mt-4 text-base font-bold">{line.slice(2)}</h2>);
    else nodes.push(<p key={index} className="text-sm leading-6 text-foreground/90">{line}</p>);
  });
  flushList();
  if (inCode && code.length) nodes.push(<pre key="code-tail" className="overflow-x-auto rounded-xl border border-border bg-black/40 p-3 text-xs"><code>{code.join("\n")}</code></pre>);
  return <div>{nodes}</div>;
}

function ClaimList({ claims }: { claims: AIAnswer["technicalEvidence"] }) {
  if (!claims.length) return <p className="text-sm text-muted-foreground">No verified evidence available.</p>;
  return <ul className="space-y-2">{claims.map((claim, index) => <li key={`${claim.statement}-${index}`} className="rounded-lg border border-border/70 bg-surface-2/40 p-3 text-sm leading-6"><span>{claim.statement}</span>{claim.evidenceIds.length > 0 && <span className="ml-2 text-[10px] font-mono text-muted-foreground">[{claim.evidenceIds.join(", ")}]</span>}</li>)}</ul>;
}

function AnswerView({ answer }: { answer: AIAnswer }) {
  const [copied, setCopied] = useState(false);
  const sections = [
    ["Technical Analysis", answer.technicalEvidence],
    ["Fundamental Analysis", answer.fundamentalEvidence],
    ["News Analysis", answer.newsEvidence],
    ["Corporate Actions", answer.corporateEvents],
    ["Risks", answer.risks],
  ] as const;

  const copy = async () => {
    await copyAnswer(answer);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-3">
      <Card className="border-primary/20 bg-primary/5 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold uppercase tracking-wider">Executive Summary</h3></div>
          <Badge variant={answer.confidence >= 75 ? "default" : "secondary"}>Confidence {answer.confidence}/100</Badge>
        </div>
        <MarkdownContent text={answer.summary || "Insufficient verified evidence to answer confidently."} />
        {answer.insufficient && <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-xs text-amber-200">The evidence layer marked this answer as insufficient. Treat missing information as a hard limitation.</p>}
      </Card>

      {sections.map(([title, claims]) => <Card key={title} className="border-border/70 bg-surface-1/60 p-4"><h3 className="mb-3 text-sm font-bold uppercase tracking-wider">{title}</h3><ClaimList claims={claims} /></Card>)}

      <Card className="border-border/70 bg-surface-1/60 p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider">Missing Information</h3>
        {answer.missingInformation.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{answer.missingInformation.map((item, i) => <li key={`${item}-${i}`}>{item}</li>)}</ul> : <p className="text-sm text-muted-foreground">None reported by the evidence layer.</p>}
      </Card>

      <Card className="border-border/70 bg-surface-1/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-bold uppercase tracking-wider">Sources</h3><Button variant="ghost" size="sm" onClick={copy}>{copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Clipboard className="mr-1 h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}</Button></div>
        <div className="grid gap-2 sm:grid-cols-2">{answer.sources.map((source) => <a key={source.id} href={source.url ?? undefined} target="_blank" rel="noreferrer" className="group rounded-xl border border-border/70 bg-surface-2/40 p-3 transition hover:border-primary/40"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold">{source.name}</p><p className="mt-1 text-xs text-muted-foreground">{sourceLabel(source)} · {source.domain}</p></div><ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" /></div></a>)}</div>
        {!answer.sources.length && <p className="text-sm text-muted-foreground">No clickable sources returned.</p>}
      </Card>

      <Card className="border-border/70 bg-surface-1/60 p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider">Evidence Timeline</h3>
        <div className="space-y-2">{answer.evidence.map((claim, index) => <div key={`${claim.statement}-${index}`} className="relative border-l border-primary/30 pl-4 text-sm leading-6"><span className="absolute -left-1 top-2 h-2 w-2 rounded-full bg-primary" />{claim.statement}<div className="mt-1 text-[10px] font-mono text-muted-foreground">Evidence: {claim.evidenceIds.join(", ") || "none"}</div></div>)}{!answer.evidence.length && <p className="text-sm text-muted-foreground">No evidence timeline returned.</p>}</div>
      </Card>

      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={copy}><Clipboard className="mr-1.5 h-3.5 w-3.5" />Copy answer</Button>
        <Button variant="outline" size="sm" onClick={() => downloadText(`${answer.symbols.join("-") || "research"}.md`, answerToMarkdown(answer), "text/markdown") }><FileText className="mr-1.5 h-3.5 w-3.5" />Export Markdown</Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}><FileDown className="mr-1.5 h-3.5 w-3.5" />Export PDF</Button>
      </div>
    </div>
  );
}

export function AiChatInterface({ mode = "assistant", activeSymbol }: { mode?: "assistant" | "stock"; activeSymbol?: string }) {
  const initial = useMemo(() => createConversation(activeSymbol), [activeSymbol]);
  const [conversation, setConversation] = useState<ChatConversation>(initial);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [revealed, setRevealed] = useState("");
  const [history, setHistory] = useState<ChatConversation[]>(() => loadConversations());
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const stopRef = useRef(false);

  useEffect(() => { saveConversations(history); }, [history]);

  const saveCurrent = (next: ChatConversation) => {
    setConversation(next);
    setHistory((prev) => [next, ...prev.filter((item) => item.id !== next.id)].slice(0, 100));
  };

  const send = async (text = input) => {
    const question = text.trim();
    if (!question || pending) return;
    stopRef.current = false;
    setInput("");
    setPending(true);
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: question, createdAt: new Date().toISOString() };
    const working = { ...conversation, symbol: conversation.symbol ?? activeSymbol, updatedAt: new Date().toISOString(), messages: [...conversation.messages, userMessage] };
    setConversation(working);
    try {
      const result = await askAI({ data: { question, ...(working.symbol ? { symbols: [working.symbol] } : {}) } });
      if (result.ok) {
        const answerMessage: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: answerToMarkdown(result.data), answer: result.data, createdAt: new Date().toISOString() };
        const next = { ...working, title: working.messages.length ? working.title : question.slice(0, 42), updatedAt: new Date().toISOString(), messages: [...working.messages, answerMessage] };
        saveCurrent(next);
        setActiveMessageId(answerMessage.id);
        const summary = result.data.summary || "Research complete.";
        setRevealed("");
        for (let index = 0; index < summary.length; index += 2) {
          if (stopRef.current) break;
          setRevealed(summary.slice(0, index + 2));
          await new Promise((resolve) => window.setTimeout(resolve, 10));
        }
      } else {
        const answerMessage: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: result.error.message, createdAt: new Date().toISOString() };
        saveCurrent({ ...working, messages: [...working.messages, answerMessage], updatedAt: new Date().toISOString() });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI request failed.";
      saveCurrent({ ...working, messages: [...working.messages, { id: crypto.randomUUID(), role: "assistant", content: message, createdAt: new Date().toISOString() }], updatedAt: new Date().toISOString() });
    } finally { setPending(false); }
  };

  const stop = () => { stopRef.current = true; setPending(false); };
  const latestAnswer = [...conversation.messages].reverse().find((message) => message.answer)?.answer;
  const suggestions = mode === "stock" && activeSymbol ? SUGGESTED_PROMPTS.map((prompt) => prompt.replace("this stock", activeSymbol)) : SUGGESTED_PROMPTS;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-6">
        <aside className="hidden rounded-2xl border border-border bg-surface-1/60 p-3 lg:block">
          <div className="mb-4 flex items-center gap-2 px-2"><Bot className="h-5 w-5 text-primary" /><span className="font-bold">Research</span></div>
          <Button className="mb-3 w-full" onClick={() => { setConversation(createConversation(activeSymbol)); setRevealed(""); }}>New chat</Button>
          <div className="space-y-1">{history.slice(0, 15).map((item) => <button key={item.id} onClick={() => setConversation(item)} className="w-full rounded-lg px-3 py-2 text-left text-xs transition hover:bg-accent"><span className="block truncate">{item.pinned ? "📌 " : ""}{item.title}</span><span className="text-muted-foreground">{new Date(item.updatedAt).toLocaleDateString()}</span></button>)}</div>
        </aside>

        <section className="min-w-0">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Phase 6.3</p><h1 className="text-xl font-bold sm:text-2xl">{mode === "stock" ? `${activeSymbol ?? "Stock"} Chat` : "AI Assistant"}</h1><p className="text-xs text-muted-foreground">Evidence-backed research · AIReasoningEngine only</p></div><div className="flex gap-2 print:hidden"><Button variant="outline" size="sm" onClick={() => setConversation({ ...conversation, pinned: !conversation.pinned })}>{conversation.pinned ? <PinOff className="mr-1 h-3.5 w-3.5" /> : <Pin className="mr-1 h-3.5 w-3.5" />}{conversation.pinned ? "Unpin" : "Pin"}</Button>{latestAnswer && <Button variant="outline" size="sm" onClick={() => send(conversation.messages.filter((m) => m.role === "user").at(-1)?.content ?? "") } disabled={pending}><RefreshCw className="mr-1 h-3.5 w-3.5" />Regenerate</Button>}</div></header>

          <div className="space-y-4">{conversation.messages.map((message) => <div key={message.id} className={message.role === "user" ? "ml-auto max-w-2xl" : "max-w-4xl"}><div className={message.role === "user" ? "rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground" : "rounded-2xl border border-border bg-surface-1/60 p-3 sm:p-4"}><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">{message.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5 text-primary" />}{message.role === "user" ? "You" : "AI Research"}</div>{message.answer ? (message.id === activeMessageId && revealed && pending ? <div><p className="text-sm leading-6">{revealed}<span className="animate-pulse">▌</span></p><p className="mt-2 text-xs text-muted-foreground">Preparing evidence cards…</p></div> : <AnswerView answer={message.answer} />) : <MarkdownContent text={message.content} />}</div></div>)}{pending && !conversation.messages.some((message) => message.id === activeMessageId) && <div className="rounded-2xl border border-border bg-surface-1/60 p-4 text-sm text-muted-foreground animate-pulse">Researching verified evidence…</div>}</div>

          {!conversation.messages.length && <div className="mx-auto max-w-3xl py-8 text-center"><div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Sparkles /></div><h2 className="text-lg font-bold">Ask a research question</h2><p className="mt-1 text-sm text-muted-foreground">The UI sends one request through <code>askAI()</code>. It never calls a market provider directly.</p></div>}

          <div className="mt-5 flex flex-wrap gap-2 print:hidden">{suggestions.map((prompt) => <button key={prompt} type="button" disabled={pending} onClick={() => void send(prompt)} className="rounded-full border border-border bg-surface-2/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50">{prompt}</button>)}</div>

          <form className="sticky bottom-2 z-10 mt-4 flex gap-2 rounded-2xl border border-border bg-background/95 p-2 shadow-2xl backdrop-blur print:hidden" onSubmit={(event) => { event.preventDefault(); void send(); }}><Input value={input} onChange={(event) => setInput(event.target.value)} disabled={pending} placeholder={activeSymbol ? `Ask about ${activeSymbol}…` : "Ask about a stock, market, portfolio or risk…"} className="border-0 bg-transparent shadow-none focus-visible:ring-0" />{pending ? <Button type="button" variant="destructive" size="icon" onClick={stop}><Square className="h-4 w-4" /><span className="sr-only">Stop generation</span></Button> : <Button type="submit" size="icon" disabled={!input.trim()}><Send className="h-4 w-4" /><span className="sr-only">Send</span></Button>}</form>
        </section>
      </div>
    </main>
  );
}
