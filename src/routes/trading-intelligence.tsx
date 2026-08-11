import { createFileRoute } from "@tanstack/react-router";
import { TradingIntelligence } from "@/components/trading/TradingIntelligence";

export const Route = createFileRoute("/trading-intelligence")({ component: TradingIntelligence });
