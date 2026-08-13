# ChetanMarkets AI

Grounded Indian stock-market intelligence platform for NSE and BSE research, designed with a **free-first, source-grounded architecture**.

## Core capabilities

- Dark, responsive market dashboard
- NSE/BSE stock search and symbol resolution
- Watchlist and portfolio views
- Technical analysis and swing-trading signals
- Fundamental and corporate-event research
- News and sentiment intelligence
- Evidence-backed AI Questions & Answers
- Gemini-powered AI Assistant with Google Search grounding
- Research timeline, evidence explorer and comparison tools
- Grounded answers with confidence, source and evidence references
- English + Hindi summaries with latest observed evidence date

## AI architecture

1. **Gemini — primary cloud AI provider** for AI Assistant reasoning and fresh web research through Google Search grounding.
2. **Normalized research context — authoritative evidence layer** for market, technical, fundamental, news and corporate facts.
3. **Ollama/local model — local fallback** when configured.
4. **OpenAI — optional fallback** when explicitly configured.
5. **Deterministic/rule-based engines — always available** for technical, fundamental and evidence synthesis.

Gemini Search grounding can discover and cross-check fresh information, while the application continues to require normalized evidence IDs for material factual claims. The AI must not invent missing prices, ratios, indicators, news, sources or evidence IDs.

## Market-data architecture

Market data stays behind a server-side provider layer. Technical and AI engines consume normalized data instead of provider-specific responses.

1. **NSE/BSE official sources** — primary verification for exchange/regulatory facts, disclosures and filings where accessible.
2. **Yahoo Finance — primary secondary market-data provider** for quotes and OHLCV history where available.
3. **Company investor-relations / regulatory disclosures** — primary corporate evidence.
4. **Screener / TradingView / reliable market-news sources** — secondary research and cross-checking.
5. **Twelve Data — optional fallback** only when `TWELVE_DATA_API_KEY` is configured.

There is no `YAHOO_API_KEY` setting. Yahoo access is handled by the server-side provider implementation. Credentials must never be placed in frontend code or committed to GitHub.

## Source hierarchy

```text
Tier A: NSE / BSE / SEBI / RBI / company filings
             ↓
Tier B: Yahoo Finance / Screener / TradingView / reliable news
             ↓
Tier C: discovery-only sources
```

Material claims should be backed by primary or reliable secondary evidence. Conflicting sources remain visible as conflicts rather than being silently averaged.

## AI grounding pipeline

```text
User question
    -> stock/symbol resolution
    -> market status
    -> parallel source collection
    -> source normalization
    -> technical + fundamental + news evidence
    -> evidence deduplication + conflict detection
    -> directional evidence synthesis
    -> Gemini reasoning + Google Search grounding
    -> bilingual dated summary
    -> deterministic fallback if AI is unavailable
    -> grounded answer + evidence + confidence + timestamps
```

For trend questions, a neutral/range-bound technical state is a valid result. The system should describe the actual indicator readings instead of treating a neutral market as missing evidence. Provider errors such as `Failed to fetch` are operational errors, never valid Executive Summary content.

## Environment

Copy `.env.example` to `.env` for local development:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-2.5-flash
```

Local fallback:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b
```

Never commit `.env` or real credentials.

## Development

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev
```

The current product name is **ChetanMarkets AI**. The repository contains the React + TypeScript frontend and the server-side market-data/AI integration layers used by the application.

See `docs/free-first-ai-data-architecture.md` for the complete provider, source, grounding and failure-handling policy.
