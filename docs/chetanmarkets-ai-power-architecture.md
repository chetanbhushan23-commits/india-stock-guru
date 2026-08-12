# ChetanMarkets AI — Power Architecture

## Product direction

ChetanMarkets AI is a grounded Indian-market research terminal. AI Q&A is the primary workspace; other capabilities remain separate modules so the interface stays powerful without becoming cluttered.

## Primary navigation

- Dashboard — market state, watchlist, alerts and research shortcuts
- AI Q&A — full-screen research and evidence workspace
- Markets — NSE/BSE stocks and indices
- Technical — charts, indicators and swing-trade analysis
- Fundamental — valuation, financial quality and ownership
- News — publisher and exchange/company announcements with sentiment
- Sectors — sector strength and relative strength
- Screener — technical/fundamental scans
- Research — reports, timelines and evidence explorer
- Watchlist — saved symbols and research queue
- Portfolio — holdings, P&L and portfolio intelligence
- Alerts — price, technical, news and corporate-event alerts

## AI Q&A contract

Every question should follow this order:

1. Resolve the company/security and exchange.
2. Classify the intent: technical, fundamental, news, corporate event, comparison, sector, portfolio or general research.
3. Collect available evidence in parallel.
4. Prefer primary sources: NSE, BSE, SEBI, RBI and company investor-relations/filings.
5. Use market/research providers such as Yahoo Finance and other configured sources as secondary evidence.
6. Normalize timestamps, symbols, units and source metadata.
7. Calculate technical/fundamental derived metrics from collected data.
8. Detect stale data, provider failures and conflicting evidence.
9. Build a compact evidence context with evidence IDs.
10. Let the configured AI reason only over that context.
11. Return a direct answer, supporting evidence, risks, missing information, confidence and sources.
12. Never invent a missing price, ratio, filing, indicator or news event.

## Free-first AI policy

- Ollama/local model is the preferred no-API-cost reasoning provider.
- Rule-based analysis remains available when a local model is unavailable.
- OpenAI/Gemini are optional provider adapters, not hard requirements.
- API keys must remain server-side/environment-only and must never be committed to Git.

## Data reliability policy

- Primary-source evidence wins when sources conflict on the same event/fact.
- A secondary source may enrich an answer but must not silently override an official filing.
- Every time-sensitive claim should carry observed/published time where available.
- Provider failures are explicit system states, not evidence of a market condition.
- Missing technical candles must never be converted into a bullish, bearish or neutral claim.
- A genuinely neutral technical set is reported as range-bound/consolidating with the actual readings.
- A response such as `Failed to fetch` is never a valid executive summary when verified evidence exists.

## UI principles

- AI Q&A gets a full-screen, large-workspace layout.
- Feature tabs are independent workspaces rather than dense dashboard cards.
- Desktop uses the full available width with a collapsible research-history sidebar.
- Research result navigation stays sticky so Overview, Technical, Fundamental, News, Risks and Sources are always reachable.
- Evidence, confidence, risks and missing information remain visible instead of being hidden behind AI prose.
- Mobile collapses secondary navigation while preserving the question composer and evidence tabs.

## Non-negotiable quality gates

- No fabricated market data.
- No unsupported investment claim presented as fact.
- No silent provider fallback that changes the source without metadata.
- No secret/API key in frontend code or repository files.
- No answer should claim data is live unless the underlying observation is actually current enough for that claim.
