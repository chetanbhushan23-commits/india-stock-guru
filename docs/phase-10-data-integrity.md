# Phase 10 — Market Data Integrity & Exchange Coverage

Phase 10 is the reliability layer for the stock-data experience. It does not replace existing market, technical, fundamental, news, or AI engines. It adds validation, provenance, symbol coverage, freshness and failure transparency around them.

## 10.0 Data Integrity Foundation
Define a single normalized market-data contract with symbol, exchange, instrument type, timestamp, source, freshness and quality metadata.

## 10.1 NSE/BSE Instrument Registry
Build a canonical registry for NSE and BSE equities, aliases, exchange codes, ISIN where available, and symbol changes.

## 10.2 Name & Symbol Resolution
Resolve company names, tickers, common aliases and exchange-qualified symbols deterministically, with ambiguity handling instead of guessing.

## 10.3 Multi-Source Quote Validation
Compare available quote providers and detect missing, stale or conflicting values before they reach downstream analysis.

## 10.4 Historical Data Validation
Validate OHLCV continuity, timestamps, duplicate candles, impossible values, corporate-action discontinuities and insufficient history.

## 10.5 Fundamental Data Quality
Track period, statement type, source, freshness and completeness for ratios and financial statements; never silently substitute unsupported values.

## 10.6 Corporate Actions & Shareholding Integrity
Normalize dividends, splits, bonuses, rights, buybacks and shareholding disclosures with source and effective-date metadata.

## 10.7 News & Source Reliability
Add source provenance, publication time, duplicate detection, freshness and reliability signals to research inputs.

## 10.8 Data Health Monitor
Provide a health view showing provider status, source freshness, symbol coverage, failed requests, conflicts and insufficient-data cases.

## 10.9 AI Data Guardrail
Before `askAI()` answers a market question, expose only validated research context. The AI must distinguish verified, stale, conflicting and missing data.

## 10.10 Market Data Command Center
Unify symbol search, exchange coverage, source health, freshness, data-quality alerts and research readiness in one responsive command center.

## Architecture Rules
- Existing engines remain the source of business calculations; Phase 10 adds validation and metadata around them.
- No fake quote, fundamental value or source may be invented to fill a gap.
- Ambiguous company names must return candidates rather than silently selecting the wrong security.
- Every market-data value used by research should have exchange/source/time context where the provider supports it.
- AI Q&A continues to call only `askAI()` and must not access providers directly.
- Provider credentials remain server-side.

## Delivery standard
Each sub-phase should include implementation, validation, and a failure-path test. A green UI with unverified data does not count as complete.
