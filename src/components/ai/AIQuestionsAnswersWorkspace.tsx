import { AIDataProviderDashboard } from "./AIDataProviderDashboard";
import { AIQuestionsAnswers } from "./AIQuestionsAnswers";

/** Unified AI research workspace with a visible trusted-source dashboard. */
export function AIQuestionsAnswersWorkspace() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1900px] px-3 pt-4 sm:px-6 lg:px-8">
        <AIDataProviderDashboard />
      </div>
      <AIQuestionsAnswers />
    </div>
  );
}
