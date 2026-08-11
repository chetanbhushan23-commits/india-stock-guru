# AI Q&A Trend Direction Fix

## Problem
Trend questions could receive many evidence items while the model still reported that the context was not directional enough.

## Fix
- Preserve all existing evidence rules.
- Add a deterministic directional synthesis from already-collected technical evidence, or market directional evidence when technical evidence is unavailable.
- The synthesis stores the exact underlying evidence ids in its note and uses `origin: computed`.
- The AI prompt explicitly requires interpretation of directional evidence for trend/movement questions.
- The answer still has to cite evidence ids and remains capped by evidence quality.

## Expected behavior
For `HFCL ka trend kya hai?`, the answer should explain the available technical bias when technical evidence exists. If technical confirmation is unavailable, it should say so and provide a qualified market-direction answer instead of claiming that the entire context is non-directional.
