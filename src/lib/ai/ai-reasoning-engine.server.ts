/**
 * AIReasoningEngine (server-only).
 *
 * Pipeline: route → resolve symbols → build ResearchContext(s) → enrich
 * directional evidence from the FULL context → select evidence → prompt a
 * provider → format + validate the answer.
 *
 * Important: directional synthesis must happen before evidence budgeting and
 * before the hard requirements gate. Otherwise a valid technical signal can
 * be dropped by the selector and the Q&A repeatedly falls into the generic
 * "insufficient evidence" response.
 */

import { routeQuestion } from "./ai-question-router";
import { canUsePartialEvidence, meetsRequirements, selectContext } from "./ai-context-selector";
import { addDirectionalEvidence } from "./directional-evidence";
import { ANSWER_SCHEMA, ANSWER_SCHEMA_NAME, SYSTEM_PROMPT, buildUserPrompt } from "./ai-prompt";
import { formatAnswer, insufficientAnswer, parseModelJson } from "./ai-response-formatter";
import { resolveProvider } from "./providers/registry.server";
import { resolveResearchSymbols, runResearchContext } from "../research-context.server";
import type { ResearchContext, ResearchDomain, ResearchRequest } from "../research-types";
import type { AIReasoningRequest, AIReasoningResult, AISelectedContext } from "./ai-types";

const researchRequestFor = (symbol: string, domains: ResearchDomain[]): ResearchRequest => ({
  symbol,
  domains,
  interval: "1d",
  range: "1y",
  quarters: 12,
  years: 10,
  newsLimit: 30,
  newsSinceDays: 14,
});

export async function reasonOverContexts(
  request: AIReasoningRequest,
  contexts: ResearchContext[],
): Promise<AIReasoningResult> {
  const { plan } = routeQuestion(request.question, request.symbols ?? []);
  const provider = resolveProvider(request.provider);

  // MUST enrich before selectContext(). The derived synthesis has high
  // importance and therefore survives the evidence budget. More importantly,
  // it makes a real technical trend visible to meetsRequirements().
  const enrichedContexts = contexts.map((context) =>
    addDirectionalEvidence(
      {
        symbol: context.symbol,
        ticker: context.ticker,
        companyName: context.companyName,
        exchange: context.exchange,
        currency: context.currency,
        builtAt: context.builtAt,
        evidence: context.evidence,
        timeline: context.timeline,
        conflicts: context.conflicts,
        gaps: context.gaps,
        coverage: context.coverage,
        quality: context.quality,
        byDomain: {
          market: context.evidence.filter((item) => item.domain === "market").map((item) => item.id),
          technical: context.evidence.filter((item) => item.domain === "technical").map((item) => item.id),
          fundamental: context.evidence.filter((item) => item.domain === "fundamental").map((item) => item.id),
          news: context.evidence.filter((item) => item.domain === "news").map((item) => item.id),
          "corporate-action": context.evidence.filter((item) => item.domain === "corporate-action").map((item) => item.id),
          event: context.evidence.filter((item) => item.domain === "event").map((item) => item.id),
        },
        droppedIds: [],
      },
      plan.intent,
    ),
  );

  const selected: AISelectedContext[] = enrichedContexts.map((context) =>
    addDirectionalEvidence(selectContext(context, plan), plan.intent),
  );

  const gate = meetsRequirements(selected, plan);
  const partialGate = gate.ok ? { ok: true, reason: null } : canUsePartialEvidence(selected, plan);
  if (!gate.ok && !partialGate.ok) {
    return {
      ok: true,
      data: insufficientAnswer({
        intent: plan.intent,
        question: request.question,
        symbols: selected.map((context) => context.symbol),
        reason: gate.reason ?? partialGate.reason ?? "The evidence set does not meet this question's requirements.",
        providerId: provider.id,
        missing: selected.flatMap((context) => context.gaps.map((gap) => `${context.ticker} · ${gap.label}: ${gap.reason}`)),
      }),
    };
  }

  let raw: string;
  let model: string | null;
  try {
    const response = await provider.complete({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(request.question, plan, selected, request.portfolio),
      schema: ANSWER_SCHEMA,
      schemaName: ANSWER_SCHEMA_NAME,
      intent: plan.intent,
    });
    raw = response.raw;
    model = response.model;
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "PROVIDER_ERROR",
        message: error instanceof Error ? error.message : "The AI provider failed.",
        intent: plan.intent,
        symbols: selected.map((context) => context.symbol),
      },
    };
  }

  const parsed = parseModelJson(raw);
  if (!parsed) {
    return {
      ok: false,
      error: {
        code: "INVALID_MODEL_OUTPUT",
        message: "The model did not return valid JSON for the required answer schema.",
        intent: plan.intent,
        symbols: selected.map((context) => context.symbol),
      },
    };
  }

  return {
    ok: true,
    data: formatAnswer({ raw: parsed, intent: plan.intent, question: request.question, contexts: selected, providerId: provider.id, model }),
  };
}

export async function runAIReasoning(request: AIReasoningRequest): Promise<AIReasoningResult> {
  const question = request.question.trim();
  if (!question) return { ok: false, error: { code: "INVALID_REQUEST", message: "The question is empty.", intent: null, symbols: [] } };

  let { plan } = routeQuestion(question, request.symbols ?? []);
  let resolvedSymbols = plan.symbols;

  if (resolvedSymbols.length === 0) {
    const discovered = await resolveResearchSymbols(question, 4);
    resolvedSymbols = discovered.map((item) => item.symbol);
    if (resolvedSymbols.length > 0) ({ plan } = routeQuestion(question, resolvedSymbols));
  }

  if (plan.symbols.length === 0) {
    return {
      ok: true,
      data: insufficientAnswer({
        intent: plan.intent,
        question,
        symbols: [],
        reason: "No listed NSE/BSE equity could be resolved from the question. Try the company name, NSE ticker, or BSE ticker.",
        providerId: resolveProvider(request.provider).id,
      }),
    };
  }

  const results = await Promise.all(
    plan.symbols.slice(0, plan.multiSymbol ? 4 : 1).map((symbol) => runResearchContext(researchRequestFor(symbol, plan.domains))),
  );

  const contexts = results.flatMap((result) => (result.ok ? [result.data] : []));
  if (contexts.length === 0) {
    const first = results.find((result) => !result.ok);
    return {
      ok: true,
      data: insufficientAnswer({
        intent: plan.intent,
        question,
        symbols: plan.symbols,
        reason: !first || first.ok ? "The research context engine returned no evidence." : first.error.message,
        providerId: resolveProvider(request.provider).id,
      }),
    };
  }

  return reasonOverContexts({ ...request, question, symbols: plan.symbols }, contexts);
}
