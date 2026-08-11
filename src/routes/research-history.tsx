import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock3, Pin, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadConversations, saveConversations, type ChatConversation } from "@/lib/ai-chat";

export const Route = createFileRoute("/research-history")({
  component: ResearchHistoryPage,
});

function ResearchHistoryPage() {
  const [items, setItems] = useState<ChatConversation[]>(() => loadConversations());
  const [query, setQuery] = useState("");

  useEffect(() => saveConversations(items), [items]);

  const filtered = items.filter((item) => `${item.title} ${item.symbol ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="min-h-screen bg-background px-3 py-5 text-foreground sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Phase 6.3</p><h1 className="text-2xl font-bold">Research History</h1><p className="text-sm text-muted-foreground">Saved AI research conversations on this device.</p></div>
          <Link to="/ai-assistant"><Button>New research</Button></Link>
        </header>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-surface-1/60 px-3"><Search className="h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations…" className="border-0 bg-transparent shadow-none focus-visible:ring-0" /></div>
        <div className="space-y-2">
          {filtered.map((item) => <article key={item.id} className="rounded-2xl border border-border bg-surface-1/60 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><Link to="/ai-assistant" className="min-w-0 flex-1"><h2 className="truncate font-semibold hover:text-primary">{item.pinned ? "📌 " : ""}{item.title}</h2><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" />{new Date(item.updatedAt).toLocaleString()} · {item.messages.length} messages{item.symbol ? ` · ${item.symbol}` : ""}</p></Link><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => setItems((prev) => prev.map((row) => row.id === item.id ? { ...row, pinned: !row.pinned } : row))}>{item.pinned ? <Pin className="h-4 w-4" /> : <Pin className="h-4 w-4 text-muted-foreground" />}</Button><Button variant="ghost" size="icon" onClick={() => setItems((prev) => prev.filter((row) => row.id !== item.id))}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button></div></div></article>)}
          {!filtered.length && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No research conversations found.</div>}
        </div>
      </div>
    </main>
  );
}
