# Phase 10 — Market Data Integrity & Exchange Coverage

## 10.1 NSE/BSE Instrument Registry
Canonical instrument boundary for exchange, symbol, name, aliases and optional ISIN. Normalize NSE `.NS` and BSE `.BO` identifiers.

## 10.2 Name & Symbol Resolution
Rank exact symbol/name/alias/prefix/contains matches and keep exchange identity explicit. Ambiguous matches must be surfaced instead of guessed.

## 10.3 Multi-Source Quote Validation
Compare available quote sources, detect conflicts and select only validated observations. Never manufacture a quote when providers disagree or fail.

## 10.4 Historical Data Validation
Validate OHLCV chronology, gaps, duplicates, impossible ranges and freshness before technical calculations consume the data.

## 10.5 Fundamental Data Quality
Track source, period, units, freshness and completeness for fundamental metrics. Distinguish missing values from zero values.

## 10.6 Corporate Actions & Shareholding Integrity
Normalize dividends, splits, bonuses, rights, buybacks and shareholding observations with dates and provenance.

## 10.7 News & Source Reliability
Track publisher, timestamp, URL, duplicate stories and source reliability. Preserve provenance for AI evidence.

## 10.8 Data Health Monitor
Expose provider health, stale feeds, missing instruments, conflicts and failed requests through a unified health model.

## 10.9 AI Data Guardrail
Prevent AI answers from treating stale, conflicting, unverified or missing market data as fact. Claims must carry evidence state.

## 10.10 Market Data Command Center
Unify instrument coverage, quote validation, historical quality, fundamentals, corporate actions, news provenance and AI data health in one monitoring workspace.

## Architecture rules
- Existing engines remain the consumers of normalized data; do not bypass them.
- Exchange identity must remain explicit: NSE and BSE are not interchangeable.
- Provider failure must be represented as missing/unavailable data, never silently fabricated.
- Every externally sourced market claim should retain provenance where available.
