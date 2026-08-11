import { createFileRoute } from "@tanstack/react-router";
import { PortfolioIntelligence } from "@/components/ai/PortfolioIntelligence";

export const Route = createFileRoute("/portfolio-intelligence")({ component: PortfolioIntelligencePage });

function PortfolioIntelligencePage() {
  return <PortfolioIntelligence />;
}
