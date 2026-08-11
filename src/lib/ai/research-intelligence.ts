/** Phase 6.4: presentation helpers only. Existing research/AI engines remain untouched. */
import type { AIReasoningResult } from "./ai-types";

export type ResearchSection = {
  title: string;
  content: string;
};

export function buildResearchSections(result: AIReasoningResult): ResearchSection[] {
  if (!result.ok) return [];
  const answer = result.answer as any;
  return [
    { title: "Executive Summary", content: answer?.executiveSummary ?? answer?.summary ?? "Research summary unavailable." },
    { title: "Technical Analysis", content: answer?.technicalAnalysis ?? "No technical analysis supplied." },
    { title: "Fundamental Analysis", content: answer?.fundamentalAnalysis ?? "No fundamental analysis supplied." },
    { title: "News Analysis", content: answer?.newsAnalysis ?? "No news analysis supplied." },
    { title: "Corporate Actions", content: answer?.corporateActions ?? "No corporate actions supplied." },
    { title: "Risks", content: answer?.risks ?? "No risk assessment supplied." },
    { title: "Missing Information", content: answer?.missingInformation ?? "No missing information reported." },
  ];
}

export function researchConfidence(result: AIReasoningResult): number | null {
  if (!result.ok) return null;
  const value = (result.answer as any)?.confidenceScore ?? (result as any).confidenceScore;
  return typeof value === "number" ? Math.max(0, Math.min(100, value)) : null;
}

export function researchMarkdown(result: AIReasoningResult): string {
  if (!result.ok) return `# Research unavailable\n\n${result.error.message}`;
  const sections = buildResearchSections(result);
  return sections.map((s) => `## ${s.title}\n\n${s.content}`).join("\n\n");
}
