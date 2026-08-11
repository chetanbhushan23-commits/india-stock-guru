import { createFileRoute } from "@tanstack/react-router";
import { TradingDashboard } from "@/components/ai/TradingDashboard";

export const Route = createFileRoute("/ml-intelligence")({ component: TradingDashboard });
