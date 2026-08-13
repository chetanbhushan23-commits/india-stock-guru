# AI Q&A — Gemini + Supabase permanent storage

## Runtime flow

`AI Q&A → /api/ai/ask → existing research/evidence engine → Gemini provider → verified AIAnswer → Supabase ai_qa_history`

The Q&A route now persists completed, evidence-backed answers server-side. Existing technical, fundamental, news, corporate-action and research engines are not changed.

## No offline/browser storage

Permanent history is stored in Supabase. The browser must not store the AI answer history as the source of truth, and no provider credential is stored in browser history.

## Required server environment

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never use a `VITE_` prefix for it and never commit the real value.

## Database setup

Run `supabase/migrations/20260813_ai_qa_history.sql` in the Supabase SQL Editor. The table stores the complete structured `AIAnswer` JSON plus searchable metadata such as question, symbols, provider, model, confidence, latest evidence date and research duration.

## API

- `POST /api/ai/ask` — runs the existing AI research flow and persists a completed answer. Response includes `storage.enabled`, `storage.id` and `storage.researchDurationMs`.
- `GET /api/ai/history?limit=50` — returns newest stored Q&A records.
- `DELETE /api/ai/history` with `{ "id": "..." }` — permanently deletes one stored record.

Storage is best-effort for the answer request: a Supabase outage does not convert an otherwise valid AI answer into a failed AI response.

## Important

Gemini is selected through the existing provider registry. This storage layer does not call Gemini directly and does not bypass the evidence/research engine. That keeps one factual pipeline for every provider.
