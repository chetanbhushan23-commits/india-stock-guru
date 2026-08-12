# AI Trend Summary Fix

## Problem
Current-trend questions could return a summary saying the research context had evidence but not enough directional evidence, even when the technical engine had a valid neutral/sideways trend or usable indicator facts.

## Fix
- Preserve neutral technical trend evidence instead of filtering it out.
- Build a deterministic directional synthesis from the strongest available technical facts.
- Treat neutral/sideways as a valid trend result, not an evidence failure.
- In the formatter, use the verified synthesis as a safe fallback when the model incorrectly marks a usable trend answer insufficient.
- Keep all fallback statements tied to existing evidence IDs.

## Expected behavior
`Reliance ka current trend` should return an evidence-backed bullish, bearish, or neutral/sideways answer whenever the research context contains usable technical trend evidence.

The system must still refuse when there is genuinely no usable evidence.
