/**
 * AIReasoningEngine (server-only).
 *
 * Pipeline: route → resolve symbols → build ResearchContext(s) → enrich
 * directional evidence from the FULL context → select evidence → prompt a
 * provider → validate the model output → return the first valid grounded
 * answer.
 *
 * Provider failover is deliberately after research/context construction: every
 * provider receives the same evidence-backed prompt, so switching providers
 * never changes the factual data layer.
 */

import { routeQuestion } from "./ai-question-router";
import { canUsePartialEvidence, meetsRequirements, selectContext } from "./ai-context-selector";
import { addDirectionalEvidence } from "./directional-evidence";
import { ANSWER_SCHEMA, ANSWER_SCHEMA_NAME, SYSTEM_PROMPT, buildUserPrompt } from "./ai-prompt";
import { formatAnswer, insufficientAnswer, parseModelJson } from "./ai-response-formatter";
import { providerCandidates, resolveProvider } from "./providers/registry.server";
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
  const providers = providerCandidates(request.provider);
  const fallbackProviderId = providers[0]?.id ?? resolveProvider(request.provider).id;

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
        providerId: fallbackProviderId,
        missing: selected.flatMap((context) => context.gaps.map((gap) => `${context.ticker} · ${gap.label}: ${gap.reason}`)),
      }),
    };
  }

  const prompt = {
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(request.question, plan, selected, request.portfolio),
    schema: ANSWER_SCHEMA,
    schemaName: ANSWER_SCHEMA_NAME,
    intent: plan.intent,
  };

  const failures: string[] = [];
  for (const provider of providers) {
    try {
      const response = await provider.complete(prompt);
      const parsed = parseModelJson(response.raw);
      if (!parsed) {
        failures.push(`${provider.id}: invalid JSON`);
        continue;
      }

      return {
        ok: true,
        data: formatAnswer({
          raw: parsed,
          intent: plan.intent,
          question: request.question,
          contexts: selected,
          providerId: provider.id,
          model: response.model,
        }),
      };
    } catch (error) {
      failures.push(`${provider.id}: ${error instanceof Error ? error.message : "provider failed"}`);
    }
  }

  return {
    ok: false,
    error: {
      code: "PROVIDER_ERROR",
      message: failures.length
        ? `All configured AI providers failed: ${failures.join(" | ")}`
        : "No configured AI provider is available.",
      intent: plan.intent,
      symbols: selected.map((context) => context.symbol),
    },
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
