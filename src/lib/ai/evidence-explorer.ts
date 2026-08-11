import type { AIAnswer, AIClaim, AISource } from "./ai-types";

export type EvidenceItem = { claim: AIClaim; section: string; sources: AISource[] };

const claimGroups: Array<[keyof AIAnswer, string]> = [
  ["evidence", "Executive Evidence"],
  ["technicalEvidence", "Technical Analysis"],
  ["fundamentalEvidence", "Fundamental Analysis"],
  ["newsEvidence", "News Analysis"],
  ["corporateEvents", "Corporate Actions"],
  ["risks", "Risks"],
];

export function flattenEvidence(answer: AIAnswer): EvidenceItem[] {
  return claimGroups.flatMap(([key, section]) => {
    const claims = answer[key];
    if (!Array.isArray(claims)) return [];
    return (claims as AIClaim[]).map((claim) => ({
      claim,
      section,
      sources: answer.sources.filter((source) => claim.evidenceIds.includes(source.id)),
    }));
  });
}

export function sourceDomains(answer: AIAnswer): string[] {
  return [...new Set(answer.sources.map((source) => source.domain))].sort();
}

export function evidenceCoverage(answer: AIAnswer): number {
  const claims = flattenEvidence(answer);
  if (!claims.length) return 0;
  return Math.round((claims.filter((item) => item.sources.length > 0).length / claims.length) * 100);
}
