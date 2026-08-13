import { useMemo, useState } from "react";
import { BadgeCheck, CheckCircle2, Globe2, Info, Landmark, Radio, ShieldCheck, Star, XCircle } from "lucide-react";
import type { AIAnswer } from "@/lib/ai/ai-types";
import { answerSourceStats, buildSourceIntelligence, sourceTierLabel, type SourceTier } from "@/lib/ai/source-intelligence";

type Props = { answer?: AIAnswer | null };
const emptyAnswer = { sources: [] } as unknown as AIAnswer;
const tierIcon = (tier: SourceTier) => tier === "primary" ? Landmark : tier === "rating" ? Star : tier === "aggregator" ? Globe2 : Radio;

export function AIDataProviderDashboard({ answer = null }: Props) {
  const [activeTier, setActiveTier] = useState<SourceTier | "all">("all");
  const effectiveAnswer = answer ?? emptyAnswer;
  const rows = useMemo(() => buildSourceIntelligence(effectiveAnswer), [effectiveAnswer]);
  const stats = useMemo(() => answerSourceStats(effectiveAnswer), [effectiveAnswer]);
  const visible = activeTier === "all" ? rows : rows.filter((row) => row.tier === activeTier);
  const ratingConnected = rows.some((row) => row.tier === "rating" && row.connected);

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
      <div className="border-b border-border bg-gradient-to-r from-primary/10 via-card to-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/15 p-3 text-primary"><ShieldCheck className="h-5 w-5" /></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">AI Data Provider Intelligence</p><h2 className="mt-1 text-xl font-black sm:text-2xl">Trusted source stack</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Official NSE/BSE evidence is preferred first, then company disclosures and rating agencies. Reuters and established publishers add independent context; Google News is discovery/corroboration only.</p></div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-right"><p className="text-2xl font-black tabular-nums">{answer ? stats.totalConnected : "—"}</p><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{answer ? "providers used" : "awaiting Q&A"}</p></div>
        </div>
      </div>
      <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-5">
        {[["Official", stats.primary, "primary" as const],["Ratings", stats.rating, "rating" as const],["Independent", stats.independent, "wire" as const],["Aggregator", stats.aggregator, "aggregator" as const],["Evidence sources", answer?.sources.length ?? 0, "all" as const]].map(([label, value, tier]) => <button key={label} onClick={() => setActiveTier(tier)} className={`rounded-xl border p-3 text-left transition ${activeTier === tier ? "border-primary bg-primary/10" : "border-border bg-background/50 hover:bg-muted/50"}`}><p className="text-lg font-black tabular-nums">{value as number}</p><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p></button>)}
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((row) => { const Icon = tierIcon(row.tier); return <article key={row.id} className={`rounded-2xl border p-4 transition ${row.connected ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-border bg-background/40"}`}><div className="flex items-start gap-3"><div className="rounded-lg bg-muted p-2"><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold">{row.name}</h3>{row.connected ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500"><CheckCircle2 className="h-3 w-3" /> Used</span> : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground"><XCircle className="h-3 w-3" /> {answer ? "Not in this answer" : "Source available"}</span>}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{row.role}</p><p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{sourceTierLabel(row.tier)} · Reliability {Math.round(row.reliability * 100)}%</p>{row.connected && <p className="mt-1 text-[10px] text-emerald-500">{row.evidenceCount} source reference{row.evidenceCount === 1 ? "" : "s"}{row.latestObservedAt ? ` · latest ${new Date(row.latestObservedAt).toLocaleString()}` : ""}</p>}</div></div></article>; })}
      </div>
      <div className="grid gap-4 border-t border-border bg-background/30 p-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border p-4"><div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold">Source priority policy</h3></div><ol className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground"><li><b className="text-foreground">1. NSE / BSE:</b> primary exchange facts, filings and corporate actions.</li><li><b className="text-foreground">2. Company IR:</b> company-issued results and disclosures.</li><li><b className="text-foreground">3. CRISIL / ICRA / CARE / India Ratings / Brickwork:</b> credit-rating evidence only when directly present.</li><li><b className="text-foreground">4. Reuters + trusted publishers:</b> independent corroboration and context.</li><li><b className="text-foreground">5. Google News:</b> discovery/corroboration only; never treated as primary proof.</li></ol></div>
        <div className="rounded-2xl border border-border p-4"><div className="flex items-center gap-2"><Info className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold">No-fabrication rule</h3></div><p className="mt-3 text-xs leading-6 text-muted-foreground">A provider is marked <b className="text-foreground">Used</b> only when the current grounded answer contains evidence from it. A rating agency listed here is not automatically a live rating feed. The AI must never invent a CRISIL/ICRA/CARE/India Ratings/Brickwork rating.</p>{answer && !ratingConnected && <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">No direct rating-agency evidence was present in this answer.</div>}</div>
      </div>
    </section>
  );
}
