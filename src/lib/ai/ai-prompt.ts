import type { AIRoutePlan, AISelectedContext } from "./ai-types";

export const ANSWER_SCHEMA_NAME = "stock_research_answer";

const claimArray = (description: string) => ({
  type: "array",
  description,
  items: {
    type: "object",
    additionalProperties: false,
    required: ["statement", "evidenceIds"],
    properties: {
      statement: { type: "string" },
      evidenceIds: { type: "array", items: { type: "string" } },
    },
  },
});

export const ANSWER_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "evidence", "technicalEvidence", "fundamentalEvidence", "newsEvidence", "corporateEvents", "risks", "missingInformation", "confidence", "insufficient"],
  properties: {
    summary: { type: "string", description: "Bilingual 3-6 sentence evidence-synthesized summary. Include an explicit Latest evidence date and provide both English and Hindi sections. Use specific figures, indicator levels, dates and named news events. Empty string only when there is no usable evidence." },
    evidence: claimArray("General evidence supporting the summary."),
    technicalEvidence: claimArray("Technical indicator evidence."),
    fundamentalEvidence: claimArray("Fundamental / financial statement evidence."),
    newsEvidence: claimArray("News and publisher-reported evidence."),
    corporateEvents: claimArray("Corporate actions, filings and exchange notices."),
    risks: claimArray("Concrete risks, each backed by evidence."),
    missingInformation: { type: "array", description: "Facts or evidence domains a complete answer would need but the evidence set lacks.", items: { type: "string" } },
    confidence: { type: "integer", description: "0-100 confidence in the answer." },
    insufficient: { type: "boolean", description: "True only when the supplied evidence cannot support even a qualified factual answer." },
  },
};

export const SYSTEM_PROMPT = `You are a research analyst for Indian equity markets (NSE/BSE). Gemini is the primary AI reasoning and web-research provider.

ABSOLUTE RULES
1. The normalized RESEARCH CONTEXT is the authoritative evidence layer for factual claims in the answer. Gemini Search grounding may be used to discover and cross-check fresh information, but never invent a number or claim that is not supported by the supplied evidence context.
2. Never invent, estimate, extrapolate or recall a fact. If a number is not in the evidence, it does not exist.
3. Every statement in every evidence section MUST cite one or more evidence ids ("evidenceIds") that appear verbatim in the context. Statements without a valid id are discarded.
4. Never cite an id you did not see. Never merge two evidence items into a new number.
5. Do not give financial advice, price targets or buy/sell directives. Present evidence and trade-offs.
6. Report disagreements listed under "conflicts" honestly rather than picking a side.
7. Put anything the evidence cannot answer into "missingInformation" — include the listed "gaps" and unavailable requested domains.
8. Partial evidence is allowed: if one requested domain is missing but another domain contains reliable evidence, answer only what the available evidence proves and explicitly disclose the missing domain. Do NOT mark the answer insufficient solely because one requested domain is unavailable.
9. Set "insufficient" to true only when there is no usable evidence-backed answer to the actual question.
10. Sections that have no supporting evidence must be empty arrays. Never pad a section.
11. Keep statements in the evidence sections short, factual and dated where the evidence is dated. Currency is INR unless the evidence says otherwise.
12. For trend, technical-analysis, swing-trade, movement, rise/fall and buy-or-wait questions, interpret the supplied directional evidence. A neutral/range-bound state is valid and should be described with the actual indicator readings.
13. A derived directional-synthesis evidence item is a valid computed fact because it is explicitly derived from cited evidence ids. Cite the synthesis id and, where useful, its underlying evidence ids.
14. Explain mixed signals when bullish and bearish evidence materially conflict.
15. SOURCE PRIORITY: prefer primary official evidence (NSE/BSE exchange notices and company investor-relations disclosures) over secondary reporting. Use established publishers for independent corroboration.
16. SUMMARY LANGUAGE: the summary MUST contain both English and Hindi. Use this structure: "Latest evidence date: YYYY-MM-DD. English: ... Hindi: ...". Keep the English and Hindi meaning consistent and do not add unsupported facts.
17. LATEST DATE: use the newest observedAt/timeline date actually present in the supplied evidence. Never claim that the answer is current if the newest evidence date is older; state the actual latest evidence date.
18. For current-trend questions, the first substantive sentence after the date MUST state the current evidence-derived bias: bullish, bearish, or neutral/sideways.
19. Every material summary sentence must be backed by one or more evidence ids in the evidence sections.
20. RATING SAFETY: never state a CRISIL/ICRA/CARE/India Ratings/Brickwork rating unless a corresponding rating-agency evidence object is actually present in the supplied context.`;

const compactEvidence = (context: AISelectedContext) => context.evidence.map((item) => ({
  id: item.id,
  domain: item.domain,
  label: item.label,
  value: item.value,
  direction: item.direction,
  importance: item.importance,
  reliability: Number(item.reliability.toFixed(2)),
  origin: item.origin,
  source: item.sourceName,
  at: item.observedAt,
  url: item.url,
  note: item.note,
  tags: item.tags,
}));

export function buildUserPrompt(question: string, plan: AIRoutePlan, contexts: AISelectedContext[], portfolio?: { symbol: string; quantity: number; avgPrice: number }[]): string {
  const payload = contexts.map((context) => ({
    symbol: context.symbol,
    company: context.companyName,
    exchange: context.exchange,
    currency: context.currency,
    builtAt: context.builtAt,
    quality: context.quality,
    evidence: compactEvidence(context),
    timeline: context.timeline.map((entry) => ({ at: entry.at, domain: entry.domain, title: entry.title, detail: entry.detail, direction: entry.direction, evidenceIds: entry.evidenceIds })),
    conflicts: context.conflicts.map((conflict) => ({ topic: conflict.topic, description: conflict.description, severity: conflict.severity, evidenceIds: conflict.evidenceIds })),
    gaps: context.gaps.map((gap) => `${gap.domain}: ${gap.label} — ${gap.reason}`),
    coverage: context.coverage.map((entry) => ({ domain: entry.domain, ok: entry.ok, items: entry.evidenceCount, completeness: entry.completeness, message: entry.message })),
  }));

  const latestEvidenceDate = payload.flatMap((context) => context.evidence.map((item) => item.at).filter(Boolean)).sort().at(-1) ?? "unknown";
  const today = new Date().toISOString().slice(0, 10);

  return [
    `QUESTION: ${question}`,
    `DETECTED INTENT: ${plan.intent}`,
    `FOCUS: ${plan.focus}`,
    `TODAY (server date): ${today}`,
    `LATEST OBSERVED EVIDENCE DATE: ${latestEvidenceDate}`,
    portfolio && portfolio.length > 0 ? `USER PORTFOLIO: ${JSON.stringify(portfolio)}` : "USER PORTFOLIO: none supplied",
    "",
    "RESEARCH CONTEXT (the authoritative evidence source):",
    JSON.stringify(payload),
    "",
    "Gemini Search grounding is enabled for fresh web research/cross-checking. Do not use a grounded web fact in the final factual claims unless the normalized evidence context supports it; never fabricate an evidence id.",
    "TRUSTED SOURCE ORDER: NSE/BSE + company IR → rating agencies when directly evidenced → established publishers → Google News discovery.",
    "Answer as JSON matching the required schema. Cite evidence ids in every statement. If requested domains are missing, disclose them in missingInformation.",
    "Write the summary in both languages using exactly: Latest evidence date: YYYY-MM-DD. English: ... Hindi: ...",
    "For current-trend questions, lead the English section with the explicit bias from the technical directional synthesis: bullish, bearish, or neutral/sideways.",
  ].join("\n");
}
