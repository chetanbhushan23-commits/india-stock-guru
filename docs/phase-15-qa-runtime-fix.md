# AI Q&A runtime fix

The development fallback provider must never present itself as an analytical AI model. When no hosted/local model is configured, it produces a clearly labelled evidence-grounded deterministic summary from supplied ResearchContext only.

The fallback must:
- never invent prices, indicators or conclusions;
- derive directional wording only from supplied evidence directions;
- calculate confidence from evidence reliability, freshness and coverage rather than a hard-coded value;
- disclose missing domains;
- preserve evidence IDs on every claim;
- remain behind AIReasoningEngine and the askAI() server function.
