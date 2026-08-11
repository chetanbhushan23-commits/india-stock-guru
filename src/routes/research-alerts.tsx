import { createFileRoute } from "@tanstack/react-router";
import { ResearchAlerts } from "@/components/ai/ResearchAlerts";

export const Route = createFileRoute("/research-alerts")({ component: ResearchAlerts });
