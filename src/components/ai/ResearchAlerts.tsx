import { useMemo, useState } from "react";
import { Bell, BellOff, Copy, RefreshCw } from "lucide-react";
import { askAI } from "@/lib/ai.functions";
import type { AIReasoningResult } from "@/lib/ai/ai-types";

type Alert = { id: string; symbol: string; prompt: string; enabled: boolean };

const DEFAULTS: Alert[] = [
  { id: "movement", symbol: "INFY", prompt: "Check for important recent movement, news, corporate actions and risks for this stock", enabled: true },
  { id: "risk", symbol: "RELIANCE", prompt: "Check for important new risks, negative developments and missing information for this stock", enabled: true },
];

export function ResearchAlerts() {
  const [alerts, setAlerts] = useState(DEFAULTS);
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, AIReasoningResult>>({});
  const enabledCount = useMemo(() => alerts.filter(a => a.enabled).length, [alerts]);

  const run = async (alert: Alert) => {
    setRunning(alert.id);
    try {
      const result = await askAI({ data: { question: alert.prompt, symbols: [alert.symbol] } });
      setResults(prev => ({ ...prev, [alert.id]: result }));
    } finally { setRunning(null); }
  };

  const toggle = (id: string) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  const copy = async (result: AIReasoningResult) => { if (result.ok) await navigator.clipboard.writeText(result.data.summary); };

  return <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6">
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="panel flex items-center justify-between gap-3 p-4">
        <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Phase 6.8</p><h1 className="text-2xl font-black">Research Alerts</h1><p className="text-sm text-muted-foreground">Evidence-based checks through the existing AI reasoning boundary.</p></div>
        <div className="rounded-xl border border-border px-3 py-2 text-sm"><b>{enabledCount}</b> enabled</div>
      </header>
      <section className="space-y-3">{alerts.map(alert => {
        const result = results[alert.id];
        return <article key={alert.id} className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="flex items-center gap-2"><span className="font-bold">{alert.symbol}</span><span className="rounded-full border border-border px-2 py-0.5 text-xs">{alert.id}</span></div><p className="mt-1 text-sm text-muted-foreground">{alert.prompt}</p></div>
            <div className="flex gap-2"><button onClick={() => toggle(alert.id)} className="rounded-xl border border-border p-2" aria-label="Toggle alert">{alert.enabled ? <Bell/> : <BellOff/>}</button><button onClick={() => void run(alert)} disabled={!alert.enabled || running === alert.id} className="rounded-xl border border-border p-2" aria-label="Run alert">{running === alert.id ? <RefreshCw className="animate-spin"/> : <RefreshCw/>}</button></div>
          </div>
          {result?.ok && <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">Confidence {result.data.confidence}% · {result.data.sources.length} sources</span><button onClick={() => void copy(result)} className="rounded-lg border border-border p-1.5" aria-label="Copy alert summary"><Copy size={15}/></button></div><p className="mt-2 text-sm leading-6">{result.data.summary}</p></div>}
          {result && !result.ok && <p className="mt-3 text-sm text-destructive">{result.error.message}</p>}
        </article>;
      })}</section>
      <p className="text-xs text-muted-foreground">Alerts in this phase are on-demand research checks; no background market-provider polling or engine changes are introduced.</p>
    </div>
  </main>;
}
