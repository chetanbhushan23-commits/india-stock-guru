import { createFileRoute } from "@tanstack/react-router";
import { MLIntelligenceSuite } from "@/components/ai/MLIntelligenceSuite";

export const Route = createFileRoute("/ml-suite")({ component: MLIntelligenceSuite });
