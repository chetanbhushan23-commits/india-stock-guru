import { createFileRoute } from "@tanstack/react-router";
import { ResearchTimeline } from "@/components/ai/ResearchTimeline";

export const Route = createFileRoute("/research-timeline")({ component: ResearchTimeline });
