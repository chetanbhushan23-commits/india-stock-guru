# ChetanMarkets AI — Free-First Open-Source Data & AI Architecture

## Goal

Keep ChetanMarkets AI usable at ₹0 for development and personal use wherever the source permits it, while preserving a strict grounded-data architecture.

## Provider policy

### AI reasoning

1. **Ollama/local model — default when available**
   - Runs on the user's machine.
   - No per-request API bill.
   - The model receives only the normalized research evidence needed for the question.
2. **Deterministic/rule-based reasoning — mandatory fallback**
   - Technical and fundamental calculations must remain usable even when no LLM is running.
   - Never fabricate a price, ratio, indicator, news item, or source.
3. **OpenAI/Gemini — optional providers**
   - Disabled unless explicitly configured by the user.
   - Never required for the core market-data or technical engine.

## Market-data policy

Use a provider cascade rather than one fragile endpoint:

1. **NSE/BSE official sources** for exchange/regulatory verification, corporate announcements, filings and exchange facts where legally and technically accessible.
2. **Yahoo Finance server-side provider** for normalized quotes/history where available.
3. **Optional Twelve Data** only when `TWELVE_DATA_API_KEY` is configured.
4. **Cached last-known-good data** may be displayed only with its timestamp and stale-data badge. Stale data must never be presented as live.

The application must normalize every provider into one internal market-data contract before technical analysis.

## Research-source tiers

### Tier A — primary

- NSE India
- BSE India
- SEBI
- RBI
- Company investor-relations pages and exchange-filed disclosures

### Tier B — high-value secondary

- Yahoo Finance
- Screener
- TradingView
- Moneycontrol
- Economic Times Markets
- Livemint

### Tier C — discovery only

Other public news/search sources can help discover an event, but a material claim should be promoted to the evidence set only after a primary or reliable secondary source is found.

## Grounding rules

- Every material claim gets an evidence ID.
- Every price/indicator has an observed timestamp.
- Source URL, source name and source tier are retained.
- Conflicting sources are shown as conflicts; they are not silently averaged.
- Missing data is represented as missing, never as zero.
- Market-closed status is not equivalent to missing technical history.
- A neutral technical reading is a valid result and must be described as neutral/range-bound with the actual indicator values.
- `Failed to fetch`, `Network error`, provider stack traces and raw HTML errors are never valid Executive Summary content.
- AI may summarize and reason over evidence, but it may not invent missing market facts.

## Question-answer pipeline

```text
User question
  -> symbol/entity resolution
  -> market status
  -> parallel source collection
  -> source normalization
  -> technical/fundamental/news calculations
  -> evidence deduplication + conflict detection
  -> directional synthesis
  -> Ollama/local reasoning (preferred)
  -> deterministic fallback when AI is unavailable
  -> answer + confidence + evidence + timestamps
```

## Free-first implementation requirements

- No provider key in frontend code.
- No `VITE_*` secret variables.
- Ollama URL/model are configurable server-side.
- Provider timeouts and retries are bounded.
- One failed source must not fail the complete research request.
- Source-level errors are captured internally and converted into a user-safe status.
- Tests should cover provider failure, market closed, no history, stale history, conflicting evidence and neutral trend.

## Recommended Ollama defaults

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b
```

The model name is configurable; do not assume a model is installed. The UI should expose provider health separately from market-data health.
