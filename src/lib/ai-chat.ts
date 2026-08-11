import type { AIAnswer, AIClaim, AIReasoningResult, AISource } from "./ai/ai-types";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  answer?: AIAnswer;
  createdAt: string;
};

export type ChatConversation = {
  id: string;
  title: string;
  symbol?: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

const STORAGE_KEY = "india-stock-guru:ai-chat-history:v1";

export const SUGGESTED_PROMPTS = [
  "Give me a complete analysis of this stock.",
  "Why did this stock move today?",
  "Is the current risk-reward attractive?",
  "What important news and corporate actions should I know?",
  "Compare the technical and fundamental picture.",
];

export function createConversation(symbol?: string): ChatConversation {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: symbol ? `${symbol} research` : "New research",
    ...(symbol ? { symbol } : {}),
    pinned: false,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function loadConversations(): ChatConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatConversation[]) : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: ChatConversation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, 100)));
}

export function answerToMarkdown(answer: AIAnswer): string {
  const section = (title: string, claims: AIClaim[]) =>
    `## ${title}\n\n${claims.length ? claims.map((claim) => `- ${claim.statement}`).join("\n") : "No verified evidence available."}\n`;

  return [
    `# ${answer.symbols.join(", ") || "Research"} — AI Research`,
    `\n**Executive Summary**\n\n${answer.summary || "Insufficient verified evidence to answer confidently."}\n`,
    section("Technical Analysis", answer.technicalEvidence),
    section("Fundamental Analysis", answer.fundamentalEvidence),
    section("News Analysis", answer.newsEvidence),
    section("Corporate Actions", answer.corporateEvents),
    section("Risks", answer.risks),
    `## Missing Information\n\n${answer.missingInformation.length ? answer.missingInformation.map((item) => `- ${item}`).join("\n") : "None reported by the evidence layer."}\n`,
    `## Confidence Score\n\n**${answer.confidence}/100**\n`,
    `## Sources\n\n${answer.sources.length ? answer.sources.map((source) => `- [${source.name}](${source.url ?? "#"})`).join("\n") : "No clickable sources returned."}\n`,
    `## Evidence Timeline\n\n${answer.evidence.map((claim) => `- ${claim.statement} — evidence: ${claim.evidenceIds.join(", ") || "none"}`).join("\n") || "No timeline evidence returned."}`,
  ].join("\n");
}

export function downloadText(filename: string, text: string, mime = "text/plain") {
  if (typeof window === "undefined") return;
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function copyAnswer(answer: AIAnswer) {
  return navigator.clipboard.writeText(answerToMarkdown(answer));
}

export function sourceLabel(source: AISource) {
  try {
    return source.url ? new URL(source.url).hostname.replace(/^www\./, "") : source.name;
  } catch {
    return source.name;
  }
}

export function resultMessage(result: AIReasoningResult) {
  if (result.ok) return result.data.summary;
  return `Unable to answer: ${result.error.message}`;
}
