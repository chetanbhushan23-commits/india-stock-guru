/**
 * Exchange-aware symbol discovery (server-only).
 *
 * Live search is preferred, but deterministic aliases/ticker extraction keep
 * stock questions resolvable when a market-search provider is temporarily down.
 * ResearchContext remains responsible for validating and collecting evidence.
 */
import { providerSearch } from "./market-data.server";
import type { SearchResult } from "./market-types";

const QUESTION_STOPWORDS = new Set([
  "WHAT", "WHY", "WHEN", "WHERE", "HOW", "WHICH", "WHO", "IS", "ARE", "THE", "A", "AN",
  "FOR", "OF", "TO", "IN", "ON", "AT", "AND", "OR", "WITH", "ABOUT", "TODAY", "CURRENT",
  "TREND", "PRICE", "STOCK", "SHARE", "SHARES", "RISK", "RISKS", "ANALYSIS", "SHORT", "TERM",
  "LONG", "PLEASE", "TELL", "ME", "KYA", "HAI", "KESE", "KA", "KI", "KE", "AUR", "MUJHE",
  "BATAO", "BATA", "KARO", "KAR", "HUA", "HUI", "KYU", "KYON", "AAJ", "ABHI", "PAR", "SE",
]);

const COMMON_ALIASES: Record<string, string> = {
  RELIANCE: "RELIANCE", "RELIANCE INDUSTRIES": "RELIANCE", INFOSYS: "INFY",
  HDFCBANK: "HDFCBANK", "HDFC BANK": "HDFCBANK", ICICIBANK: "ICICIBANK", "ICICI BANK": "ICICIBANK",
  SBI: "SBIN", "STATE BANK OF INDIA": "SBIN", TCS: "TCS", "TATA CONSULTANCY SERVICES": "TCS",
  TATAMOTORS: "TATAMOTORS", "TATA MOTORS": "TATAMOTORS", TATASTEEL: "TATASTEEL", "TATA STEEL": "TATASTEEL",
  ITC: "ITC", LT: "LT", "L&T": "LT", "LARSEN AND TOUBRO": "LT", BHARTIARTL: "BHARTIARTL",
  AIRTEL: "BHARTIARTL", "BHARTI AIRTEL": "BHARTIARTL", AXISBANK: "AXISBANK", "AXIS BANK": "AXISBANK",
  KOTAK: "KOTAKBANK", KOTAKBANK: "KOTAKBANK", "KOTAK MAHINDRA BANK": "KOTAKBANK", ADANIENT: "ADANIENT",
  "ADANI ENTERPRISES": "ADANIENT", ADANIPORTS: "ADANIPORTS", "ADANI PORTS": "ADANIPORTS", MARUTI: "MARUTI",
  "MARUTI SUZUKI": "MARUTI", SUNPHARMA: "SUNPHARMA", "SUN PHARMA": "SUNPHARMA", LUPIN: "LUPIN",
  WIPRO: "WIPRO", HCLTECH: "HCLTECH", "HCL TECHNOLOGIES": "HCLTECH", BAJFINANCE: "BAJFINANCE",
  "BAJAJ FINANCE": "BAJFINANCE", BAJAJFINSV: "BAJAJFINSV", "BAJAJ FINSERV": "BAJAJFINSV", TITAN: "TITAN",
  ULTRACEMCO: "ULTRACEMCO", "ULTRATECH CEMENT": "ULTRACEMCO",
};

function normalize(value: string): string {
  return value.replace(/\.NS$|\.BO$/i, "").replace(/[^\p{L}\p{N}&.-]+/gu, " ").replace(/\s+/g, " ").trim().toUpperCase();
}

function compactQuery(question: string): string {
  return question.replace(/[^\p{L}\p{N}.&-]+/gu, " ").split(/\s+/).filter(Boolean)
    .filter((word) => !QUESTION_STOPWORDS.has(word.toUpperCase())).slice(0, 6).join(" ").trim();
}

function score(result: SearchResult, query: string): number {
  const q = normalize(query), ticker = normalize(result.ticker), name = normalize(result.name);
  return (ticker === q ? 150 : 0) + (name === q ? 145 : 0) + (ticker.startsWith(q) ? 90 : 0) +
    (name.startsWith(q) ? 85 : 0) + (name.includes(q) ? 60 : 0) + (ticker.includes(q) ? 50 : 0) +
    (result.exchange === "NSE" ? 5 : 0);
}

function deterministicCandidates(query: string): SearchResult[] {
  const normalized = normalize(query);
  const alias = COMMON_ALIASES[normalized];
  const compact = normalized.replace(/\s+/g, "");
  const ticker = alias ?? (/^[A-Z][A-Z0-9&.-]{1,19}$/.test(compact) ? compact : null);
  if (!ticker) return [];
  return [
    { symbol: `${ticker}.NS`, ticker, name: ticker, exchange: "NSE" },
    { symbol: `${ticker}.BO`, ticker, name: ticker, exchange: "BSE" },
  ];
}

export async function resolveQuestionSymbols(question: string, limit = 4): Promise<SearchResult[]> {
  const query = compactQuery(question);
  const merged = new Map<string, SearchResult>();

  // Seed deterministic matches first: provider outages must not turn a known
  // stock question into "no listed NSE/BSE equity could be resolved".
  for (const candidate of [query, question.trim()]) {
    for (const result of deterministicCandidates(candidate)) merged.set(result.symbol, result);
  }

  for (const candidate of [query, question.trim()].filter(Boolean)) {
    try {
      const results = await providerSearch(candidate);
      for (const result of results) merged.set(result.symbol, result);
    } catch {
      // Live discovery is best-effort; deterministic matches remain available.
    }
    if (merged.size >= limit && query) break;
  }

  return [...merged.values()].sort((a, b) => score(b, query) - score(a, query)).slice(0, limit);
}
