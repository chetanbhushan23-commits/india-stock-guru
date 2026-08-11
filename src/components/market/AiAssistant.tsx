import { AiChatInterface } from "@/components/ai/AiChatInterface";

/**
 * Dashboard AI panel.
 * Phase 6.3 removes the previous mock reply path: all AI requests flow through
 * askAI() -> AIReasoningEngine and never access market providers from the UI.
 */
export function AiAssistant({ activeSymbol }: { activeSymbol: string }) {
  return <AiChatInterface mode="stock" activeSymbol={activeSymbol} />;
}
