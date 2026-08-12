# Phase 17 — ChetanMarkets AI Q&A Full Evidence Coverage

## Goal

Prevent the AI Q&A workspace from showing empty sections such as `No verified evidence available` when the research context contains usable evidence, and make the confidence badge deterministic rather than dependent on the model's self-reported confidence.

## Changes

- Default research now collects all six domains:
  - market
  - technical
  - fundamental
  - news
  - corporate-action
  - event
- Research API validation accepts all six domains.
- Added dedicated NSE/BSE corporate-action collector using the existing exchange-aware aggregation adapters.
- Added dedicated NSE/BSE/IR event collector.
- Corporate-action and event feeds are isolated from the broad news fan-out for better reliability and lower unnecessary traffic.
- AI context selection preserves at least one evidence item from every populated domain before spending the remaining evidence budget on intent-ranked evidence.
- AI response formatting now deterministically fills missing Technical, Fundamental, News, Corporate Events and Risk sections from verified evidence.
- `Failed to fetch`, generic insufficient-directional-evidence text and model omissions cannot erase an available evidence-backed fallback.
- `100/100` confidence is reserved for a fully populated answer with at least five attributable sources, fresh evidence and no unresolved research conflict. It does not represent certainty about future market movement.

## Verification target

For a question such as `Reliance ka trend kya hai?`, the Q&A result should populate the evidence workspace with technical, fundamental, news, corporate-event and risk information whenever those domains return verified data. A successful empty corporate-action feed is explicitly reported as feed coverage rather than the UI showing a misleading empty section.
