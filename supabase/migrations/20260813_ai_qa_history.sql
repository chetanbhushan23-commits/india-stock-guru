-- Permanent server-side AI Q&A storage.
-- The application writes with SUPABASE_SERVICE_ROLE_KEY; the key is never exposed to the browser.

create extension if not exists pgcrypto;

create table if not exists public.ai_qa_history (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  symbols text[] not null default '{}',
  answer jsonb not null,
  provider_id text,
  model text,
  intent text,
  confidence numeric,
  generated_at timestamptz,
  latest_evidence_date timestamptz,
  research_duration_ms integer,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ai_qa_history_created_at_idx
  on public.ai_qa_history (created_at desc);

create index if not exists ai_qa_history_symbols_idx
  on public.ai_qa_history using gin (symbols);

create index if not exists ai_qa_history_pinned_idx
  on public.ai_qa_history (pinned, created_at desc);

alter table public.ai_qa_history enable row level security;

-- No public/browser policy is created intentionally. Server-side writes/reads use
-- the Supabase service-role key and therefore bypass RLS. Do not expose that key.
