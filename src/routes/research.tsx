import { createFileRoute } from "@tanstack/react-router";
import { ResearchIntelligence } from "@/components/ai/ResearchIntelligence";

export const Route = createFileRoute("/research")({ component: ResearchPage });

function ResearchPage() {
  return <ResearchIntelligence />;
}
