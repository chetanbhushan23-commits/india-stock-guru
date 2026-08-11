# Phase 16 — Universal NSE/BSE Stock AI Research Coverage

## Goal
Any resolvable NSE/BSE listed equity asked in natural language should receive the strongest evidence-backed answer the available data supports.

## Coverage contract
For a resolved stock, the research context should collect all available relevant domains: market, technical, fundamental, news, corporate actions and events. The AI provider then reasons only over validated evidence.

## Answer behavior
- Technical questions prioritize technical evidence but may use market, fundamental, news and event context when useful.
- Fundamental questions prioritize fundamentals but retain market, technical, news and event context for risk/context.
- Trend/movement questions use market + technical + news and can use fundamentals/events as supporting context.
- General stock questions use the broadest available evidence set.
- Missing domains are disclosed; available verified evidence is still used for a qualified answer.
- No fabricated data, price targets or guaranteed returns.

## Resolution
Company names, NSE tickers, BSE tickers and common natural-language forms should resolve through the exchange-aware discovery layer. Ambiguous results must be surfaced instead of guessed.

## Provider architecture
UI -> askAI -> AIReasoningEngine -> exchange-aware resolution -> ResearchContext collectors -> evidence selector -> AI provider -> schema validation -> answer.

## Definition of done
A stock question must not be rejected merely because one non-critical research domain is unavailable. The system should return the available evidence-backed sections, clearly identify gaps, sources and confidence, and preserve the distinction between facts and AI interpretation.
