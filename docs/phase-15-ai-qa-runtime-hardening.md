# Phase 15 — AI Q&A Runtime Hardening

Phase 14 established reliability contracts. Phase 15 moves those contracts into the runtime path before further feature expansion.

## 15.0 Runtime Integration Audit
Trace the real Q&A path from UI -> askAI -> routing -> reasoning -> evidence -> formatted answer. Remove dead/mock paths and identify swallowed errors.

## 15.1 Intent & Entity Resolution
Resolve Hindi, English and mixed-language questions, stock/company aliases and explicit NSE/BSE identity. Ambiguous entities must request clarification.

## 15.2 Evidence Plan Execution
Build a deterministic evidence plan per question and consume existing authoritative engines only. UI never calls providers directly.

## 15.3 AIReasoningEngine Integration
Ensure every production Q&A answer passes through the existing reasoning boundary and receives structured context rather than disconnected provider output.

## 15.4 Claim Validation
Validate answer claims against evidence IDs, freshness, source metadata and conflict state before rendering.

## 15.5 Conversation Context
Persist active entity, intent, timeframe and relevant evidence across follow-up questions with bounded context.

## 15.6 Failure & Recovery
Handle provider failure, missing evidence, ambiguous symbols, timeouts and malformed AI output with explicit user-facing recovery states.

## 15.7 Streaming & Cancellation
Implement real streaming through the supported AI boundary, with cancellation and safe partial-answer handling. Never fake streaming in the UI.

## 15.8 Q&A Evaluation Suite
Create deterministic regression cases for common Indian-stock questions, follow-ups, comparisons, latest-news questions and unavailable-data cases.

## 15.9 Observability & Quality Metrics
Measure latency, failure rate, evidence coverage, unsupported claims, confidence, clarification rate and answer regeneration rate without logging secrets.

## 15.10 Production Q&A Gate
Do not declare the core production-ready until runtime tests pass, claims are evidence-backed, entity resolution is reliable and failure states are graceful.

## Non-negotiable architecture
- Q&A UI calls `askAI()` only.
- Never access NSE/BSE/Yahoo/other market providers directly from UI.
- Never bypass `AIReasoningEngine`.
- Never fabricate unavailable data or sources.
- Preserve source URLs, timestamps, evidence IDs and confidence where available.
