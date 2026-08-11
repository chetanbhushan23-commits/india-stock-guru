import { createFileRoute } from "@tanstack/react-router";
import { AiChatInterface } from "@/components/ai/AiChatInterface";

export const Route = createFileRoute("/ai-assistant")({
  component: AiAssistantPage,
});

function AiAssistantPage() {
  return <AiChatInterface mode="assistant" />;
}
