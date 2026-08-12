# ChetanMarkets AI

Grounded Indian stock-market intelligence platform for NSE and BSE research.

## Core capabilities

- Dark, responsive market dashboard
- NSE/BSE stock search and symbol resolution
- Watchlist and portfolio views
- Technical analysis and swing-trading signals
- Fundamental and corporate-event research
- News and sentiment intelligence
- Evidence-backed AI Questions & Answers
- Research timeline, evidence explorer and comparison tools
- Grounded answers with confidence and source/evidence references

## Market-data architecture

ChetanMarkets AI keeps market data behind a server-side provider layer so the AI and technical engines consume normalized data rather than provider-specific responses.

1. **Yahoo Finance — primary market-data provider** for quotes, search and OHLCV history where available.
2. **NSE/BSE — official-source verification** for exchange/regulatory evidence and disclosures.
3. **Twelve Data — optional fallback** for quotes/history only when `TWELVE_DATA_API_KEY` is configured server-side.

There is no `YAHOO_API_KEY` setting in the application. Yahoo access is handled by the server-side provider implementation. Twelve Data credentials must never be placed in frontend code or committed to GitHub.

## AI grounding pipeline

```text
User question
    -> stock/symbol resolution
    -> research context
    -> technical + fundamental + news evidence
    -> directional evidence synthesis
    -> AI reasoning
    -> grounded answer + evidence + confidence
```

For trend questions, a neutral/range-bound technical state is a valid result. The system should describe the actual indicator readings instead of treating a neutral market as missing evidence.

## Environment

Create a local `.env` file when using the optional Twelve Data fallback:

```env
TWELVE_DATA_API_KEY=your_key_here
```

Never commit `.env` or an actual API key. `.env.example` contains the safe placeholder configuration.

## Development

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev
```

The current product name is **ChetanMarkets AI**. The repository contains the React + TypeScript frontend and the server-side market-data/AI integration layers used by the application.
