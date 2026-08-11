# AI Q&A Runtime Evidence Fix

## Problem
Questions such as `reliance ka trend kya hai?` could return `Insufficient verified evidence` with confidence 0 when the research context had usable evidence from at least one domain.

## Fix
The reasoning pipeline distinguishes:
- hard failure: no usable evidence or unusable research quality;
- partial evidence: at least one usable evidence domain is available while another requested domain is missing.

Partial evidence is passed to the reasoning model with explicit missing-domain instructions. The model may answer only from supplied evidence and must list missing domains in `missingInformation`.

## Safety
- No fabricated market data.
- Missing technical/fundamental/news evidence is never inferred.
- Existing collectors and AIReasoningEngine remain authoritative.
- UI continues to call `askAI()` only.
