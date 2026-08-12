import { useState } from "react";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { askAI } from "@/lib/ai.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AiAssistant({ activeSymbol }: { activeSymbol: string }) {
  const [question, setQuestion] = useState("");
  const [summary, setSummary] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async (text = question) => {
    const value = text.trim();
    if (!value || loading) return;
    setLoading(true);
    try {
      const result = await askAI({ data: { question: value, symbols: [activeSymbol] } });
      if (result.ok) {
        setSummary(result.data.summary || "Insufficient verified evidence to provide a reliable summary.");
        setConfidence(result.data.confidence);
      } else {
        setSummary(result.error.message);
        setConfidence(null);
      }
    } catch (error) {
      setSummary(error instanceof Error ? error.message : "AI request failed.");
      setConfidence(null);
    } finally {
      setLoading(false);
    }
  };

  const prompts = [`${activeSymbol} ka current trend kya hai?`, `${activeSymbol} ke short-term risks kya hain?`];

  return (
    <Card className="w-full min-w-0 overflow-hidden border-border/70 bg-surface-1/70 p-3 sm:p-4">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary"><Bot className="h-4 w-4" /></span>
          <div className="min-w-0"><h3 className="truncate text-sm font-bold">ChetanMarkets AI</h3><p className="truncate text-[10px] text-muted-foreground">Evidence-backed · {activeSymbol}</p></div>
        </div>
        {confidence !== null && <Badge variant={confidence >= 75 ? "default" : "secondary"}>Confidence {confidence}/100</Badge>}
      </div>
      <div className="mt-3 flex min-w-0 gap-2"><Input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void ask(); }} disabled={loading} placeholder={`Ask about ${activeSymbol}…`} className="min-w-0 flex-1" aria-label="Ask ChetanMarkets AI about this stock" /><Button size="icon" onClick={() => void ask()} disabled={loading || !question.trim()} aria-label="Ask ChetanMarkets AI">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div>
      {loading && <div className="mt-3 flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-surface-2/40 p-3 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" /><span>Researching {activeSymbol}… gathering evidence and generating an answer.</span></div>}
      {!loading && !summary && <div className="mt-3 space-y-2"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Suggested</p><div className="grid gap-2">{prompts.map((prompt) => <button key={prompt} type="button" onClick={() => void ask(prompt)} className="w-full min-w-0 rounded-lg border border-border/70 bg-surface-2/50 px-3 py-2 text-left text-xs leading-5 transition hover:border-primary/40 hover:bg-surface-2"><span className="mr-1 inline-flex align-middle text-primary"><Sparkles className="h-3 w-3" /></span><span className="break-words">{prompt}</span></button>)}</div></div>}
      {!loading && summary && <div className="mt-3 min-w-0 rounded-xl border border-border/70 bg-surface-2/40 p-3"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">Executive Summary</p><p className="whitespace-pre-wrap break-words text-xs leading-5 text-foreground/90">{summary}</p><p className="mt-2 text-[10px] text-muted-foreground">Open ChetanMarkets AI for the full evidence, sources, risks and timeline.</p></div>}
    </Card>
  );
}
