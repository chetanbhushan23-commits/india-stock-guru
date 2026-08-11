import { createFileRoute } from "@tanstack/react-router";
import { StockComparison } from "@/components/ai/StockComparison";

export const Route = createFileRoute("/compare")({ component: StockComparison });
