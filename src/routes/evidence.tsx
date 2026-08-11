import { createFileRoute } from "@tanstack/react-router";
import { EvidenceExplorer } from "@/components/ai/EvidenceExplorer";

export const Route = createFileRoute("/evidence")({ component: EvidencePage });

function EvidencePage() {
  return <EvidenceExplorer />;
}
