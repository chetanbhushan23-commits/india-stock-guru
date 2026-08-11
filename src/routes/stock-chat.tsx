import { createFileRoute } from "@tanstack/react-router";
import { AiChatInterface } from "@/components/ai/AiChatInterface";

export const Route = createFileRoute("/stock-chat")({
  component: StockChatPage,
});

function StockChatPage() {
  return <AiChatInterface mode="stock" />;
}
