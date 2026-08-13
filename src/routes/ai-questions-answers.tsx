import { createFileRoute } from "@tanstack/react-router";
import { AIQuestionsAnswersWorkspace } from "@/components/ai/AIQuestionsAnswersWorkspace";

export const Route = createFileRoute("/ai-questions-answers")({ component: AIQuestionsAnswersWorkspace });
