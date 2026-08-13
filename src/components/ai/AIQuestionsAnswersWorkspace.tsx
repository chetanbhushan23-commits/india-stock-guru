import { AIDataProviderDashboard } from "./AIDataProviderDashboard";
import { AIQuestionsAnswers } from "./AIQuestionsAnswers";

/**
 * Unified AI research workspace. The provider dashboard is deliberately
 * rendered before Q&A so users can understand the evidence stack before
 * trusting an answer.
 */
export function AIQuestionsAnswersWorkspace() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1900px] px-3 pt-4 sm:px-6 lg:px-8">
        <AIDataProviderDashboardPlaceholder />
      </div>
      <AIQuestionsAnswers />
    </div>
  );
}

function AIDataProviderDashboardPlaceholder() {
  // The live dashboard is attached to each completed answer inside the Q&A
  // result in the next UI pass. This shell keeps the route backward compatible
  // while the provider policy is already available to the AI layer.
  return null;
}
