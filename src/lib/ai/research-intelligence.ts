/** Phase 6.4: presentation helpers only. Existing research/AI engines remain untouched. */
import type { AIReasoningResult } from "./ai-types";

export type ResearchSection = { title: string; content: string };

export function buildResearchSections(result: AIReasoningResult): ResearchSection[] {
  if (!result.ok) return [];
  const answer = result.data;
  return [
    { title: "Executive Summary", content: answer.summary },
    { title: "Technical Analysis", content: claimsToText(answer.technicalEvidence) },
    { title: "Fundamental Analysis", content: claimsToText(answer.fundamentalEvidence) },
    { title: "News Analysis", content: claimsToText(answer.newsEvidence) },
    { title: "Corporate Actions", content: claimsToText(answer.corporateEvents) },
    { title: "Risks", content: claimsToText(answer.risks) },
    { title: "Missing Information", content: answer.missingInformation.length ? answer.missingInformation.map((item) => `• ${item}`).join("\n") : "None reported." },
  ];
}

function claimsToText(claims: { statement: string }[]): string {
  return claims.length ? claims.map((claim) => `• ${claim.statement}`).join("\n") : "No verified evidence supplied.";
}

export function researchConfidence(result: AIReasoningResult): number | null {
  return result.ok ? Math.max(0, Math.min(100, result.data.confidence)) : null;
}

export function researchMarkdown(result: AIReasoningResult): string {
  if (!result.ok) return `# Research unavailable\n\n${result.error.message}`;
  const sections = buildResearchSections(result);
  const sources = result.data.sources.map((source) => `- ${source.name}${source.url ? ` — ${source.url}` : ""}`).join("\n");
  return `${sections.map((s) => `## ${s.title}\n\n${s.content}`).join("\n\n")}\n\n## Sources\n\n${sources || "No sources supplied."}`;
}
