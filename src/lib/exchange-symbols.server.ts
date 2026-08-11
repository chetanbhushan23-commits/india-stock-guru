/**
 * Exchange-aware symbol discovery (server-only).
 *
 * Resolution strategy:
 * 1. Search the live NSE/BSE-capable market discovery provider.
 * 2. Prefer exact ticker/name matches and keep both .NS and .BO results.
 * 3. If a natural-language question contains no obvious ticker, search a
 *    compact company-name phrase before falling back to the full question.
 *
 * This module only resolves symbols. ResearchContext remains responsible for
 * collecting market/technical/fundamental/news evidence.
 */

import { providerSearch } from "./market-data.server";
import type { SearchResult } from "./market-types";

const QUESTION_STOPWORDS = new Set([
  "WHAT", "WHY", "WHEN", "WHERE", "HOW", "WHICH", "WHO", "IS", "ARE", "THE", "A", "AN",
  "FOR", "OF", "TO", "IN", "ON", "AT", "AND", "OR", "WITH", "ABOUT", "TODAY", "CURRENT",
  "TREND", "PRICE", "STOCK", "SHARE", "SHARES", "RISK", "RISKS", "ANALYSIS", "SHORT", "TERM",
  "LONG", "PLEASE", "TELL", "ME", "KYA", "HAI", "KESE", "KA", "KI", "KE", "AUR", "ME", "MUJHE",
  "BATAO", "BATA", "KARO", "KAR", "HUA", "HUI", "KYU", "KYON", "AAJ", "ABHI", "PAR", "SE",
]);

function compactQuery(question: string): string {
  const words = question
    .replace(/[^\p{L}\p{N}.&-]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !QUESTION_STOPWORDS.has(word.toUpperCase()))
    .slice(0, 6);
  return words.join(" ").trim();
}

function score(result: SearchResult, query: string): number {
  const q = query.toLowerCase();
  const ticker = result.ticker.toLowerCase();
  const name = result.name.toLowerCase();
  let value = 0;
  if (ticker === q) value += 100;
  if (name === q) value += 95;
  if (ticker.startsWith(q)) value += 60;
  if (name.startsWith(q)) value += 55;
  if (name.includes(q)) value += 40;
  if (ticker.includes(q)) value += 35;
  return value;
}

export async function resolveQuestionSymbols(question: string, limit = 4): Promise<SearchResult[]> {
  const query = compactQuery(question);
  const candidates = [query, question.trim()].filter(Boolean);
  const merged = new Map<string, SearchResult>();

  for (const candidate of candidates) {
    try {
      const results = await providerSearch(candidate);
      for (const result of results) merged.set(result.symbol, result);
      if (merged.size >= limit && query) break;
    } catch {
      // Symbol discovery is best-effort. The research engine will report a
      // verified evidence gap if no usable symbol can be resolved.
    }
  }

  return [...merged.values()]
    .sort((a, b) => score(b, query) - score(a, query))
    .slice(0, limit);
}
