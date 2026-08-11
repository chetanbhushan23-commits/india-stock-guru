/**
 * Prompt construction + the strict JSON schema every provider must enforce.
 *
 * The model sees ONLY the selected ResearchContext, serialised as compact
 * JSON with stable evidence ids. Any statement it makes must cite those ids.
 */

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
  required: [
    "summary",
    "evidence",
    "technicalEvidence",
    "fundamentalEvidence",
    "newsEvidence",
    "corporateEvents",
    "risks",
    "missingInformation",
    "confidence",
    "insufficient",
  ],
  properties: {
    summary: { type: "string", description: "Plain-language answer. Empty string only when there is no usable evidence." },
    evidence: claimArray("General evidence supporting the summary."),
    technicalEvidence: claimArray("Technical indicator evidence."),
    fundamentalEvidence: claimArray("Fundamental / financial statement evidence."),
    newsEvidence: claimArray("News and publisher-reported evidence."),
    corporateEvents: claimArray("Corporate actions, filings and exchange notices."),
    risks: claimArray("Concrete risks, each backed by evidence."),
    missingInformation: {
      type: "array",
      description: "Facts or evidence domains a complete answer would need but the evidence set lacks.",
      items: { type: "string" },
    },
    confidence: { type: "integer", description: "0-100 confidence in the answer." },
    insufficient: {
      type: "boolean",
      description: "True only when the supplied evidence cannot support even a qualified factual answer.",
    },
  },
};

export const SYSTEM_PROMPT = `You are a research analyst for Indian equity markets (NSE/BSE).

ABSOLUTE RULES
1. You may use ONLY the evidence objects supplied in the RESEARCH CONTEXT. You have no other knowledge of this company, its price, its financials or the news.
2. Never invent, estimate, extrapolate or recall a fact. If a number is not in the evidence, it does not exist.
3. Every statement in every section MUST cite one or more evidence ids ("evidenceIds") that appear verbatim in the context. Statements without a valid id are discarded.
4. Never cite an id you did not see. Never merge two evidence items into a new number.
5. Do not give financial advice, price targets or buy/sell directives. Present evidence and trade-offs.
6. Report disagreements listed under "conflicts" honestly rather than picking a side.
7. Put anything the evidence cannot answer into "missingInformation" — include the listed "gaps" and unavailable requested domains.
8. Partial evidence is allowed: if one requested domain is missing but another domain contains reliable evidence, answer only what the available evidence proves and explicitly disclose the missing domain. Do NOT mark the answer insufficient solely because one requested domain is unavailable.
9. Set "insufficient" to true only when there is no usable evidence-backed answer to the actual question. When sufficient evidence exists, provide a qualified summary and a confidence score that reflects the limitations.
10. Sections that have no supporting evidence must be empty arrays. Never pad a section.
11. Keep statements short, factual and dated where the evidence is dated. Currency is INR unless the evidence says otherwise.
12. For trend, technical-analysis, swing-trade, movement, rise/fall and buy-or-wait questions, interpret the supplied directional evidence. Do not merely repeat that evidence exists. If technical evidence is present, determine the technical bias from its directional indicators and the supplied technical directional synthesis. If technical evidence is unavailable, state that technical confirmation is unavailable and use any available market directional evidence for a qualified answer.
13. A derived directional-synthesis evidence item is a valid computed fact because it is explicitly derived from the cited evidence ids in its note. Cite the synthesis id and, where useful, its underlying evidence ids.
14. Never call a context "non-directional" when it contains a directional-synthesis item or directional technical/market evidence. Explain mixed signals when bullish and bearish evidence materially conflict.`;

const compactEvidence = (context: AISelectedContext) =>
  context.evidence.map((item) => ({
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

export function buildUserPrompt(
  question: string,
  plan: AIRoutePlan,
  contexts: AISelectedContext[],
  portfolio?: { symbol: string; quantity: number; avgPrice: number }[],
): string {
  const payload = contexts.map((context) => ({
    symbol: context.symbol,
    company: context.companyName,
    exchange: context.exchange,
    currency: context.currency,
    builtAt: context.builtAt,
    quality: context.quality,
    evidence: compactEvidence(context),
    timeline: context.timeline.map((entry) => ({
      at: entry.at,
      domain: entry.domain,
      title: entry.title,
      detail: entry.detail,
      direction: entry.direction,
      evidenceIds: entry.evidenceIds,
    })),
    conflicts: context.conflicts.map((conflict) => ({
      topic: conflict.topic,
      description: conflict.description,
      severity: conflict.severity,
      evidenceIds: conflict.evidenceIds,
    })),
    gaps: context.gaps.map((gap) => `${gap.domain}: ${gap.label} — ${gap.reason}`),
    coverage: context.coverage.map((entry) => ({
      domain: entry.domain,
      ok: entry.ok,
      items: entry.evidenceCount,
      completeness: entry.completeness,
      message: entry.message,
    })),
  }));

  return [
    `QUESTION: ${question}`,
    `DETECTED INTENT: ${plan.intent}`,
    `FOCUS: ${plan.focus}`,
    portfolio && portfolio.length > 0 ? `USER PORTFOLIO: ${JSON.stringify(portfolio)}` : "USER PORTFOLIO: none supplied",
    "",
    "RESEARCH CONTEXT (the only permitted source of facts):",
    JSON.stringify(payload),
    "",
    "Answer as JSON matching the required schema. Cite evidence ids in every statement. If requested domains are missing, disclose them in missingInformation and answer from the available evidence without inventing anything.",
  ].join("\n");
}
