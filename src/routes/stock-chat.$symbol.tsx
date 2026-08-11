import { createFileRoute } from "@tanstack/react-router";
import { AiChatInterface } from "@/components/ai/AiChatInterface";

export const Route = createFileRoute("/stock-chat/$symbol")({
  component: StockSymbolChatPage,
});

function StockSymbolChatPage() {
  const { symbol } = Route.useParams();
  return <AiChatInterface mode="stock" activeSymbol={symbol.toUpperCase()} />;
}
