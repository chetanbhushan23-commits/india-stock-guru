# Phase 9 — NSE/BSE Data Correctness

## Coverage
- Stock discovery accepts company names, NSE tickers, and BSE tickers.
- Discovery keeps exchange-qualified symbols (`.NS` / `.BO`) and ranks exact matches first.
- AI questions written in natural language can resolve a company before evidence collection.
- Market search requests up to 100 equity candidates and returns the best 50 NSE/BSE matches.

## Evidence architecture
The AI UI still calls only `askAI()`. The AIReasoningEngine does not access market providers directly. Symbol discovery is delegated to the Research Context service, and all market/technical/fundamental/news evidence continues through ResearchContext.

## Data-source policy
- NSE provides an official securities-available-for-trading master and official market/corporate data products.
- BSE publishes its standardized security master format and exchange data products.
- The current free market-quote implementation uses Yahoo Finance's NSE/BSE-qualified instruments for quote/history discovery. This is a practical free provider, not a claim of official exchange real-time entitlement.
- For guaranteed exchange-direct real-time/tick/order-book accuracy in production, an authorized NSE/BSE data feed or broker API must replace/augment the free quote provider.

## Quality rules
- Never invent a symbol or price.
- If a company cannot be resolved, return a verified evidence gap instead of a fabricated answer.
- Keep exchange suffixes throughout collection so NSE and BSE instruments are not silently mixed.
- Preserve source/evidence metadata for AI answers.
