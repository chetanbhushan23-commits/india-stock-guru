/**
 * AI Reasoning Layer — shared DTOs (client-safe, provider-independent).
 *
 * The reasoning layer consumes ONLY a ResearchContext (Phase 6.1). It never
 * touches market/technical/fundamental/news providers directly, and it never
 * invents facts: every claim must cite an evidence id present in the context.
 *
 * These shapes are the exact contract a future FastAPI backend must return.
 */

import type { ResearchContext, ResearchDomain, ResearchEvidence } from "../research-types";
import type { DataQualityGate, SourceHealth } from "./source-health";

export type AIIntent = "why-fall" | "why-rise" | "explain-movement" | "technical-analysis" | "fundamental-analysis" | "news-analysis" | "corporate-actions" | "compare-stocks" | "buy-or-wait" | "swing-trade" | "long-term" | "risk-analysis" | "portfolio" | "general-market";
export const AI_INTENTS: AIIntent[] = ["why-fall", "why-rise", "explain-movement", "technical-analysis", "fundamental-analysis", "news-analysis", "corporate-actions", "compare-stocks", "buy-or-wait", "swing-trade", "long-term", "risk-analysis", "portfolio", "general-market"];
export type IntentClassification = { intent: AIIntent; confidence: number; symbols: string[]; matched: string[]; alternatives: { intent: AIIntent; score: number }[] };
export type AIRoutePlan = { intent: AIIntent; symbols: string[]; domains: ResearchDomain[]; requiredDomains: ResearchDomain[]; evidenceBudget: number; minQuality: number; multiSymbol: boolean; focus: string };
export type AISelectedContext = { symbol: string; ticker: string; companyName: string | null; exchange: "NSE" | "BSE" | null; currency: string | null; builtAt: string; evidence: ResearchEvidence[]; timeline: ResearchContext["timeline"]["entries"]; conflicts: ResearchContext["conflicts"]; gaps: ResearchContext["gaps"]; coverage: ResearchContext["coverage"]; quality: ResearchContext["quality"]; byDomain: Record<ResearchDomain, string[]>; droppedIds: string[] };
export type AISource = { id: string; name: string; url: string | null; domain: ResearchDomain; observedAt: string | null };
export type AIClaim = { statement: string; evidenceIds: string[] };
export type AIAnswerSectionKey = "evidence" | "technical" | "fundamental" | "news" | "corporateEvents" | "risks";
export type AIAnswer = {
  version: 1; intent: AIIntent; symbols: string[]; question: string; summary: string; evidence: AIClaim[]; technicalEvidence: AIClaim[]; fundamentalEvidence: AIClaim[]; newsEvidence: AIClaim[]; corporateEvents: AIClaim[]; risks: AIClaim[]; missingInformation: string[]; confidence: number; sources: AISource[]; insufficient: boolean; generatedAt: string; providerId: string; model: string | null; droppedClaims: number;
  /** Deterministic source-health/audit layer shown by the AI Q&A dashboard. */
  sourceHealth?: SourceHealth[];
  /** Automatic gate explaining whether the selected evidence is answer-safe. */
  dataQualityGate?: DataQualityGate;
  /** Cross-source directional agreement for the evidence used in the answer. */
  consensus?: { state: "bullish" | "bearish" | "mixed" | "neutral"; score: number; bullish: number; bearish: number; sources: number };
};
export const INSUFFICIENT_EVIDENCE_MESSAGE = "Insufficient verified evidence to answer confidently.";
export type AIProviderId = "openai" | "gemini" | "ollama" | "mock";
export type AIProviderRequest = { system: string; user: string; schema: Record<string, unknown>; schemaName: string; intent: AIIntent };
export type AIProviderResponse = { raw: string; model: string | null };
export type AIProvider = { id: AIProviderId; name: string; isConfigured(): boolean; complete(request: AIProviderRequest): Promise<AIProviderResponse> };
export type AIErrorCode = "NO_PROVIDER" | "PROVIDER_ERROR" | "INVALID_MODEL_OUTPUT" | "INSUFFICIENT_EVIDENCE" | "INVALID_REQUEST" | "CONTEXT_ERROR";
export type AIError = { code: AIErrorCode; message: string; intent: AIIntent | null; symbols: string[] };
export type AIReasoningResult = { ok: true; data: AIAnswer } | { ok: false; error: AIError };
export type AIReasoningRequest = { question: string; symbols?: string[]; provider?: AIProviderId; portfolio?: { symbol: string; quantity: number; avgPrice: number }[] };
