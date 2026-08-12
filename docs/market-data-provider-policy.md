# ChetanMarkets AI — Market Data Provider Policy

## Provider hierarchy

1. **Yahoo Finance — primary**
   - Used as the default market-data source when the existing application path supports the requested observation.
   - No `YAHOO_API_KEY` is required by this project configuration.
   - Provider failures must be surfaced as unavailable/stale data; never fabricate values.

2. **NSE/BSE — verification / primary-source evidence**
   - Exchange identity remains explicit (`NSE` vs `BSE`).
   - Official exchange observations and filings should be preferred for regulatory/corporate evidence and used to validate market claims where available.

3. **Twelve Data — optional fallback**
   - Enabled only when `TWELVE_DATA_API_KEY` is configured server-side.
   - It must not silently replace validated Yahoo/NSE/BSE observations.
   - Fallback observations retain provider provenance and freshness metadata.

## Data integrity rules

- Never put provider keys in `VITE_*` variables or frontend source code.
- Never commit a real API key to GitHub.
- Normalize NSE/BSE symbols before provider requests.
- Validate OHLCV chronology, duplicates, gaps, impossible ranges and freshness before technical indicators consume candles.
- When providers disagree, preserve the conflict and lower confidence instead of choosing a value silently.
- AI Q&A may only use normalized, evidence-backed observations.

## Technical-analysis rule

The technical engine must consume normalized OHLCV from the market-data service. Provider selection belongs in the data layer, not inside the AI Q&A or indicator calculation logic.
