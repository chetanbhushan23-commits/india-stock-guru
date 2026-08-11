# Phase 9 — AI Questions & Answers Intelligence

This phase is implemented as a dedicated evidence-backed Q&A workspace on top of the existing AI reasoning contract. The UI calls only `askAI()`.

## 9.0 Foundation — DONE
Dedicated AI Questions & Answers route and modular workspace.

## 9.1 Question Understanding & Intent — INTEGRATED
The workspace sends the raw question through `askAI()`, which owns intent classification and symbol routing. No provider access is performed by the UI.

## 9.2 Evidence Retrieval & Relevance — INTEGRATED
The answer renders only evidence-backed claims returned by the reasoning layer. Missing evidence is shown instead of invented content.

## 9.3 Source Verification & Freshness — INTEGRATED
Sources are rendered with provenance/domain and observed-at metadata when supplied by the reasoning layer.

## 9.4 AI Reasoning & Claim Validation — INTEGRATED
The UI consumes the typed `AIAnswer` contract and displays evidence IDs attached to claims, preserving the existing reasoning/validation boundary.

## 9.5 Confidence & Answer Quality — IMPLEMENTED
Added a client-safe Q&A quality score based on source coverage, claim coverage, section coverage, freshness metadata, and engine confidence. Confidence is displayed with High/Medium/Low labels.

## 9.6 Advanced Q&A Interface — IMPLEMENTED
Responsive full-width workspace with structured answer sections, source cards, evidence cards, copy answer, regenerate, loading state, suggested prompts, and dark-mode-compatible Tailwind styling.

## 9.7 Q&A History — IMPLEMENTED
Local history stores up to 50 recent answers, supports reopening and pin/unpin, and survives page reloads through browser storage.

## 9.8 Follow-up & Context — FOUNDATION IMPLEMENTED
Suggested question prompts and regenerate/reopen flows are provided. Full multi-turn server-side context remains behind the existing `askAI()` contract and is not implemented through direct providers.

## 9.9 AI Answer Evaluation & Self-Check — IMPLEMENTED IN UI LAYER
A deterministic quality score is calculated from the returned evidence structure. Unsupported/missing evidence is surfaced explicitly. The authoritative claim validation remains inside the existing AI reasoning engine.

## 9.10 AI Q&A Command Center — IMPLEMENTED
Combines question input, history, structured research answer, confidence/quality, evidence, sources, missing information, timeline status, copy, export to Markdown, and regenerate in one responsive workspace.

## Architecture Rules
- Q&A UI calls only `askAI()`.
- No direct market-provider access from the Q&A UI.
- Existing technical, fundamental, news, corporate-action, and research engines remain unchanged.
- Evidence-backed answers only; missing evidence is explicitly reported.
- Client-side history contains returned answer data only; no provider credentials are stored.
- Modular services and mobile-responsive dark-mode UI.

## Explicit limitations of this increment
- True token-by-token streaming requires a streaming server function/provider contract; the current `askAI()` contract is request/response.
- PDF export requires a PDF renderer dependency; Markdown export is included without adding a new dependency.
- Full server-side multi-turn memory remains an `askAI()` backend concern and is not bypassed in the client.
