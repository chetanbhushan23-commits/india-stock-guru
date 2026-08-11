export type DecisionSignalState = "verified" | "stale" | "conflict" | "missing" | "unverified";

export type DecisionSignal = {
  id: string;
  label: string;
  state: DecisionSignalState;
  confidence: number;
  evidenceIds: string[];
  summary?: string;
};

export type DecisionContext = {
  symbol: string;
  asOf?: string;
  signals: DecisionSignal[];
  missingInformation: string[];
};

export type DecisionAction = "BUY" | "HOLD" | "REDUCE" | "EXIT" | "NO_DECISION";

export type DecisionAssessment = {
  action: DecisionAction;
  confidence: number;
  rationale: string[];
  risks: string[];
  invalidationConditions: string[];
  evidenceIds: string[];
};

export function buildDecisionContext(symbol: string, signals: DecisionSignal[], missingInformation: string[] = []): DecisionContext {
  return {
    symbol: symbol.trim().toUpperCase(),
    asOf: new Date().toISOString(),
    signals: signals.filter((signal) => signal.id && signal.label),
    missingInformation: [...new Set(missingInformation.filter(Boolean))],
  };
}

export function decisionConfidence(context: DecisionContext): number {
  if (!context.signals.length) return 0;
  const usable = context.signals.filter((signal) => signal.state === "verified");
  if (!usable.length) return 0;
  const average = usable.reduce((sum, signal) => sum + Math.max(0, Math.min(100, signal.confidence)), 0) / usable.length;
  const completenessPenalty = Math.min(30, context.missingInformation.length * 5);
  const conflictPenalty = context.signals.filter((signal) => signal.state === "conflict").length * 10;
  return Math.max(0, Math.round(average - completenessPenalty - conflictPenalty));
}

export function isDecisionSafe(context: DecisionContext): boolean {
  return context.signals.length > 0 && context.signals.some((signal) => signal.state === "verified") && !context.signals.some((signal) => signal.state === "unverified");
}
