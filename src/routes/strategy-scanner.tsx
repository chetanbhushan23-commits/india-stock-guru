import { createFileRoute } from "@tanstack/react-router";
import { StrategyScanner } from "@/components/strategy/StrategyScanner";

export const Route = createFileRoute("/strategy-scanner")({ component: StrategyScanner });
