import { createFileRoute } from "@tanstack/react-router";
import { ResearchReport } from "@/components/ai/ResearchReport";

export const Route = createFileRoute("/research-report")({ component: ResearchReport });
