import { createFileRoute } from "@tanstack/react-router";
import { AIQuestionsAnswers } from "@/components/ai/AIQuestionsAnswers";

export const Route = createFileRoute("/ai-questions-answers")({ component: AIQuestionsAnswers });
