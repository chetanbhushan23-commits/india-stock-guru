import { createFileRoute } from "@tanstack/react-router";
import { ResearchWatchlist } from "@/components/ai/ResearchWatchlist";

export const Route = createFileRoute("/research-watchlist")({ component: ResearchWatchlist });
