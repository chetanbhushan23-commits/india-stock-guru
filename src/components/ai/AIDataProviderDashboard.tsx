import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CheckCircle2, Clock3, Globe2, Info, Landmark, Radio, ShieldCheck, Star, XCircle } from "lucide-react";
import type { AIAnswer } from "@/lib/ai/ai-types";
import { answerSourceStats, buildSourceIntelligence, sourceTierLabel, type SourceTier } from "@/lib/ai/source-intelligence";
import { loadQAHistory, qualityScore } from "@/lib/ai/qa-intelligence";

type Props = { answer?: AIAnswer | null };
const emptyAnswer = { sources: [] } as unknown as AIAnswer;
const tierIcon = (tier: SourceTier) => tier === "primary" ? Landmark : tier === "rating" ? Star : tier === "aggregator" ? Globe2 : Radio;

function freshnessLabel(observedAt: string | null): { label: string; tone: string } {
  if (!observedAt) return { label: "No timestamp", tone: "text-muted-foreground" };
  const ageMinutes = Math.max(0, (Date.now() - new Date(observedAt).getTime()) / 60000);
  if (ageMinutes <= 60) return { label: "Fresh · <1h", tone: "text-emerald-500" };
  if (ageMinutes <= 360) return { label: "Recent · <6h", tone: "text-emerald-500" };
  if (ageMinutes <= 1440) return { label: "Today", tone: "text-lime-500" };
  if (ageMinutes <= 4320) return { label: "Recent · <3d", tone: "text-amber-500" };
  if (ageMinutes <= 10080) return { label: "Aged · <7d", tone: "text-orange-500" };
  return { label: "Stale · >7d", tone: "text-red-500" };
}

export function AIDataProviderDashboard({ answer = null }: Props) {
  const [activeTier, setActiveTier] = useState<SourceTier | "all">("all");
  const [liveAnswer, setLiveAnswer] = useState<AIAnswer | null>(answer);

  // The dashboard sits above the Q&A workspace, so keep it synchronized with
  // the latest saved Q&A result without duplicating the AI request itself.
  useEffect(() => {
    if (answer) {
      setLiveAnswer(answer);
      return;
    }
    const sync = () => {
      const latest = loadQAHistory()[0]?.answer ?? null;
      setLiveAnswer(latest);
    };
    sync();
    const timer = window.setInterval(sync, 1000);
    return () => window.clearInterval(timer);
  }, [answer]);

  const effectiveAnswer = liveAnswer ?? emptyAnswer;
  const rows = useMemo(() => buildSourceIntelligence(effectiveAnswer), [effectiveAnswer]);
  const stats = useMemo(() => answerSourceStats(effectiveAnswer), [effectiveAnswer]);
  const visible = activeTier === "all" ? rows : rows.filter((row) => row.tier === activeTier);
  const ratingConnected = rows.some((row) => row.tier === "rating" && row.connected);
  const freshness = rows.filter((row) => row.connected).map((row) => freshnessLabel(row.latestObservedAt));
  const freshCount = freshness.filter((item) => item.label.startsWith("Fresh") || item.label.startsWith("Recent") || item.label === "Today").length;
  const quality = liveAnswer ? qualityScore(liveAnswer) : null;

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
      <div className="border-b border-border bg-gradient-to-r from-primary/10 via-card to-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/15 p-3 text-primary"><ShieldCheck className="h-5 w-5" /></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Evidence &amp; Source Health</p><h2 className="mt-1 text-xl font-black sm:text-2xl">Can I trust this answer?</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Live quality and source-health view for the latest AI Q&amp;A result. It automatically follows the newest saved research answer and never counts a provider unless evidence is actually present.</p></div>
          </div>
          <div className="flex gap-2">
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-right"><p className="text-2xl font-black tabular-nums">{liveAnswer ? stats.totalConnected : "—"}</p><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{liveAnswer ? "providers used" : "awaiting Q&A"}</p></div>
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-right"><p className="text-2xl font-black tabular-nums">{quality ?? "—"}</p><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{liveAnswer ? "quality /100" : "quality"}</p></div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-5">
        {[["Official", stats.primary, "primary" as const],["Ratings", stats.rating, "rating" as const],["Independent", stats.independent, "wire" as const],["Aggregator", stats.aggregator, "aggregator" as const],["Evidence sources", liveAnswer?.sources.length ?? 0, "all" as const]].map(([label, value, tier]) => <button key={label} onClick={() => setActiveTier(tier)} className={`rounded-xl border p-3 text-left transition ${activeTier === tier ? "border-primary bg-primary/10" : "border-border bg-background/50 hover:bg-muted/50"}`}><p className="text-lg font-black tabular-nums">{value as number}</p><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p></button>)}
      </div>

      {liveAnswer && <div className="grid gap-3 border-b border-border bg-background/30 p-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /><p className="text-xs font-bold">Freshness</p></div><p className="mt-2 text-lg font-black">{freshCount}/{stats.totalConnected}</p><p className="text-[11px] text-muted-foreground">used providers have fresh/recent observations</p></div>
        <div className="rounded-xl border border-border bg-card p-3"><div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-primary" /><p className="text-xs font-bold">Evidence coverage</p></div><p className="mt-2 text-lg font-black">{liveAnswer.sources.length}</p><p className="text-[11px] text-muted-foreground">verified source references in this answer</p></div>
        <div className="rounded-xl border border-border bg-card p-3"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><p className="text-xs font-bold">AI confidence</p></div><p className="mt-2 text-lg font-black">{liveAnswer.confidence}/100</p><p className="text-[11px] text-muted-foreground">answer confidence, separate from source quality</p></div>
      </div>}

      <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((row) => { const Icon = tierIcon(row.tier); const fresh = row.connected ? freshnessLabel(row.latestObservedAt) : null; return <article key={row.id} className={`rounded-2xl border p-4 transition ${row.connected ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-border bg-background/40"}`}><div className="flex items-start gap-3"><div className="rounded-lg bg-muted p-2"><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold">{row.name}</h3>{row.connected ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500"><CheckCircle2 className="h-3 w-3" /> Used</span> : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground"><XCircle className="h-3 w-3" /> {liveAnswer ? "Not used" : "Awaiting answer"}</span>}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{row.role}</p><p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{sourceTierLabel(row.tier)} · Reliability {Math.round(row.reliability * 100)}%</p>{row.connected && <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold"><span className="text-emerald-500">{row.evidenceCount} evidence</span><span className={fresh?.tone}>{fresh?.label}</span>{row.latestObservedAt && <span className="text-muted-foreground">{new Date(row.latestObservedAt).toLocaleString()}</span>}</div>}</div></div></article>; })}
      </div>

      <div className="grid gap-4 border-t border-border bg-background/30 p-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border p-4"><div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold">How to read this dashboard</h3></div><div className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground"><p><b className="text-emerald-500">Used</b> = this source actually supplied evidence to the answer.</p><p><b className="text-emerald-500">Fresh/Recent</b> = the observation timestamp is recent enough for the current research task.</p><p><b className="text-amber-500">Aged</b> = use the evidence carefully and check the date.</p><p><b className="text-red-500">Stale</b> = old evidence should not be treated as current market information.</p><p><b className="text-foreground">Quality</b> measures evidence quality/coverage; <b className="text-foreground">Confidence</b> measures final AI answer confidence. They are intentionally separate.</p></div></div>
        <div className="rounded-2xl border border-border p-4"><div className="flex items-center gap-2"><Info className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold">Source priority &amp; safety</h3></div><ol className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground"><li><b className="text-foreground">1. NSE / BSE:</b> exchange facts, filings and corporate actions.</li><li><b className="text-foreground">2. Company IR:</b> company-issued results and disclosures.</li><li><b className="text-foreground">3. CRISIL / ICRA / CARE / India Ratings / Brickwork:</b> rating evidence only when directly present.</li><li><b className="text-foreground">4. Reuters + trusted publishers:</b> independent corroboration and context.</li><li><b className="text-foreground">5. Google News:</b> discovery/corroboration only; never primary proof.</li></ol>{liveAnswer && !ratingConnected && <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">No direct rating-agency evidence was present in this answer. The AI must not invent a rating.</div>}</div>
      </div>
    </section>
  );
}
