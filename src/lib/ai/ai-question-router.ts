/**
 * AIQuestionRouter — turns a classified question into an execution plan.
 *
 * The router decides WHICH research domains must be collected, how much
 * evidence the model may see and how strict the quality bar is. It never
 * calls a provider and never touches upstream engines.
 */

import { classifyIntent } from "./intent-classifier";
import type { AIIntent, AIRoutePlan, IntentClassification } from "./ai-types";
import type { ResearchDomain } from "../research-types";

// For a resolved NSE/BSE stock question, collect the broadest evidence set.
// The selector still ranks evidence by intent, so this increases coverage
// without forcing the model to treat every domain as equally important.
const STOCK_EVIDENCE: ResearchDomain[] = [
  "market",
  "technical",
  "fundamental",
  "news",
  "corporate-action",
  "event",
];

const MARKET_NEWS: ResearchDomain[] = ["market", "news", "corporate-action", "event"];

type Policy = Omit<AIRoutePlan, "intent" | "symbols" | "multiSymbol">;

const POLICIES: Record<AIIntent, Policy> = {
  "why-fall": {
    domains: STOCK_EVIDENCE, requiredDomains: ["market"], evidenceBudget: 60, minQuality: 35,
    focus: "Explain the decline using dated market, technical, news, fundamental and event evidence. Rank causes by importance and recency.",
  },
  "why-rise": {
    domains: STOCK_EVIDENCE, requiredDomains: ["market"], evidenceBudget: 60, minQuality: 35,
    focus: "Explain the advance using dated market, technical, news, fundamental and event evidence. Rank causes by importance and recency.",
  },
  "explain-movement": {
    domains: STOCK_EVIDENCE, requiredDomains: ["market"], evidenceBudget: 60, minQuality: 30,
    focus: "Describe price action and combine technical structure with relevant news, fundamentals, corporate actions and events when evidence supports them.",
  },
  "technical-analysis": {
    domains: STOCK_EVIDENCE, requiredDomains: ["technical"], evidenceBudget: 60, minQuality: 40,
    focus: "Prioritize technical indicators and levels, while using market, fundamental, news and event evidence for context and risk.",
  },
  "fundamental-analysis": {
    domains: STOCK_EVIDENCE, requiredDomains: ["fundamental"], evidenceBudget: 60, minQuality: 40,
    focus: "Prioritize reported financials and valuation, while using market, technical, news, corporate actions and events for context.",
  },
  "news-analysis": {
    domains: STOCK_EVIDENCE, requiredDomains: ["news"], evidenceBudget: 60, minQuality: 30,
    focus: "Prioritize recent publisher and exchange evidence, then connect confirmed news to market, technical and fundamental context without inventing causality.",
  },
  "corporate-actions": {
    domains: MARKET_NEWS, requiredDomains: ["news"], evidenceBudget: 45, minQuality: 25,
    focus: "List confirmed corporate actions, exchange notices and events with dates, while using market context only when supported.",
  },
  "compare-stocks": {
    domains: STOCK_EVIDENCE, requiredDomains: ["market"], evidenceBudget: 60, minQuality: 40,
    focus: "Compare symbols metric by metric across market, technical, fundamental, news and event evidence. Never compare a missing metric.",
  },
  "buy-or-wait": {
    domains: STOCK_EVIDENCE, requiredDomains: ["market", "technical"], evidenceBudget: 60, minQuality: 50,
    focus: "Present evidence-based trade-offs using technical, fundamental, news, event and risk context. Never give a guaranteed outcome or directive.",
  },
  "swing-trade": {
    domains: STOCK_EVIDENCE, requiredDomains: ["technical"], evidenceBudget: 60, minQuality: 45,
    focus: "Focus on multi-day structure, momentum, volatility and levels, with news, fundamentals and events as supporting risk context.",
  },
  "long-term": {
    domains: STOCK_EVIDENCE, requiredDomains: ["fundamental"], evidenceBudget: 60, minQuality: 50,
    focus: "Weight multi-year fundamentals most heavily while checking valuation, technical context, news, corporate actions and material events.",
  },
  "risk-analysis": {
    domains: STOCK_EVIDENCE, requiredDomains: ["market"], evidenceBudget: 60, minQuality: 35,
    focus: "Enumerate concrete evidenced risks across market, technical, fundamental, news, corporate-action and event context.",
  },
  portfolio: {
    domains: STOCK_EVIDENCE, requiredDomains: ["market"], evidenceBudget: 50, minQuality: 30,
    focus: "Answer at the holdings level. Use supplied positions plus validated stock research context; disclose missing evidence.",
  },
  "general-market": {
    domains: MARKET_NEWS, requiredDomains: ["market"], evidenceBudget: 45, minQuality: 25,
    focus: "Answer about the broad market using market and news/event evidence. Do not extrapolate a single stock to an index.",
  },
};

export function policyFor(intent: AIIntent): Policy {
  return POLICIES[intent];
}

export function routeQuestion(
  question: string,
  hintedSymbols: string[] = [],
): { classification: IntentClassification; plan: AIRoutePlan } {
  const classification = classifyIntent(question, hintedSymbols);
  const policy = POLICIES[classification.intent];
  const multiSymbol = classification.intent === "compare-stocks" || classification.intent === "portfolio";
  const symbols = multiSymbol ? classification.symbols : classification.symbols.slice(0, 1);

  return {
    classification,
    plan: {
      intent: classification.intent,
      symbols,
      domains: policy.domains,
      requiredDomains: policy.requiredDomains,
      evidenceBudget: policy.evidenceBudget,
      minQuality: policy.minQuality,
      multiSymbol,
      focus: policy.focus,
    },
  };
}
