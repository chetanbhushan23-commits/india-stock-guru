# Phase 14 — Core Stabilization & AI Q&A Master Upgrade

The AI Q&A layer is the core product surface. This phase prioritizes reliability over adding more features.

## 14.0 Full System Audit
Audit routes, AI orchestration, data services, research, technical/fundamental/news/corporate engines, search, UI and error boundaries.

## 14.1 Question Understanding
Normalize Hindi/English/mixed-language questions and extract intent, timeframe, entities and required evidence.

## 14.2 Stock Resolution
Resolve company names, aliases and symbols to canonical instruments. Never guess when a query is ambiguous.

## 14.3 Evidence Orchestration
Create an evidence plan and consume authoritative existing engines rather than calling market providers directly from UI.

## 14.4 AI Reasoning Upgrade
Pass facts, evidence IDs, dates, source metadata, confidence, conflicts and missing information into the reasoning layer.

## 14.5 Answer Quality Gate
Reject or qualify unsupported, stale, conflicting or low-confidence claims before publishing an answer.

## 14.6 Multi-turn Conversation
Preserve conversation context, active symbol, intent and relevant evidence for follow-up questions.

## 14.7 Q&A Interface
Improve answer structure, source/evidence cards, confidence, loading/error states, regeneration and mobile behavior.

## 14.8 Error Recovery
Return explicit unavailable/missing-data states and actionable recovery instead of blank or fabricated answers.

## 14.9 Automated Evaluation
Add deterministic test cases for stock resolution, Hindi/English questions, follow-ups, comparisons, news, trend and decision questions.

## 14.10 AI Q&A Master Gate
Require evidence coverage, valid claims, freshness awareness, confidence calibration, context continuity and graceful failure before declaring the core production-ready.

## Rules
- UI calls `askAI()` only.
- Never bypass AIReasoningEngine.
- Never access market providers directly from Q&A UI.
- Never fabricate unavailable data.
- Facts, analysis, scenarios and decisions must remain distinguishable.
