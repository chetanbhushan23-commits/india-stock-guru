/**
 * Provider registry (server-only).
 *
 * Resolution order: explicit request override → AI_PROVIDER env → configured
 * provider preference → remaining configured providers → MockProvider.
 */

import type { AIProvider, AIProviderId } from "../ai-types";
import { openAIProvider } from "./openai-provider.server";
import { geminiProvider } from "./gemini-provider.server";
import { ollamaProvider } from "./ollama-provider.server";
import { mockProvider } from "./mock-provider";

export const AI_PROVIDERS: Record<AIProviderId, AIProvider> = {
  openai: openAIProvider,
  gemini: geminiProvider,
  ollama: ollamaProvider,
  mock: mockProvider,
};

// Gemini is the preferred cloud reasoning/research provider. Ollama remains
// available as an explicit/local fallback and OpenAI remains optional.
const PREFERENCE: AIProviderId[] = ["gemini", "ollama", "openai"];

export function providerCandidates(requested?: AIProviderId): AIProvider[] {
  const ordered: AIProviderId[] = [];
  const configured = process.env["AI_PROVIDER"] as AIProviderId | undefined;
  if (requested) ordered.push(requested);
  if (configured) ordered.push(configured);
  ordered.push(...PREFERENCE);

  const seen = new Set<AIProviderId>();
  return ordered
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((id) => AI_PROVIDERS[id])
    .filter((provider) => provider?.isConfigured());
}

export function resolveProvider(requested?: AIProviderId): AIProvider {
  return providerCandidates(requested)[0] ?? mockProvider;
}

export function providerStatus() {
  return (Object.keys(AI_PROVIDERS) as AIProviderId[]).map((id) => ({
    id,
    name: AI_PROVIDERS[id].name,
    configured: AI_PROVIDERS[id].isConfigured(),
  }));
}
