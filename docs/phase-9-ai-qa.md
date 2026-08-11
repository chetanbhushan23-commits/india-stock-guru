# Phase 9 — AI Questions & Answers Intelligence

Phase 9 is a dedicated evidence-backed Q&A workspace built on the existing AI reasoning contract. The UI calls only `askAI()`.

- **9.0 Foundation:** dedicated AI Questions & Answers route and modular workspace.
- **9.1 Question Understanding & Intent:** integrated through the existing `askAI()` routing and intent layer.
- **9.2 Evidence Retrieval & Relevance:** structured answer rendering uses only evidence-backed claims returned by the reasoning layer.
- **9.3 Source Verification & Freshness:** sources render provenance/domain and observed-at metadata when supplied.
- **9.4 AI Reasoning & Claim Validation:** typed `AIAnswer` claims retain evidence IDs; provider access stays behind the reasoning layer.
- **9.5 Confidence & Answer Quality:** deterministic client-safe quality scoring combines source coverage, claim coverage, section coverage, freshness metadata and engine confidence.
- **9.6 Advanced Q&A Interface:** responsive full-width workspace, structured sections, source/evidence cards, suggested prompts, copy, regenerate and Markdown export.
- **9.7 Q&A History:** up to 50 recent answers are stored locally with reopen and pin/unpin support.
- **9.8 Follow-up & Context:** suggested prompts plus reopen/regenerate flows; multi-turn server context remains behind `askAI()` and is not bypassed.
- **9.9 AI Answer Evaluation & Self-Check:** deterministic UI quality gate surfaces insufficient evidence and reports a quality score; authoritative claim validation remains in the reasoning engine.
- **9.10 AI Q&A Command Center:** combines question input, history, structured analysis, confidence, evidence, sources, missing information, timeline status and answer actions.

## Architecture Rules
- Q&A UI calls only `askAI()`.
- No direct market-provider access from the Q&A UI.
- Existing technical, fundamental, news, corporate-action and research engines remain unchanged.
- Evidence-backed answers only; missing evidence is explicitly reported.
- No provider credentials are stored in browser history.

## Current contract limitations
- True token streaming requires a streaming `askAI()` server contract; current API is request/response.
- PDF export is not added in this increment; Markdown export is dependency-free.
- Full server-side multi-turn memory remains an `askAI()` backend concern.
