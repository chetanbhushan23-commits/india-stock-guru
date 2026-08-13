import type { AIAnswer, AISource } from "./ai-types";

export type SourceTier = "primary" | "rating" | "wire" | "publisher" | "aggregator";

export type SourceCatalogItem = {
  id: string;
  name: string;
  tier: SourceTier;
  role: string;
  reliability: number;
  homepage: string | null;
};

/**
 * Source policy for grounded Indian-equity answers.
 * A catalog entry is not a live connection: the UI marks a source connected
 * only when evidence from that source is actually present in the answer.
 */
export const TRUSTED_SOURCE_CATALOG: SourceCatalogItem[] = [
  { id: "nse", name: "NSE India", tier: "primary", role: "Exchange prices, filings and corporate announcements", reliability: 1, homepage: "https://www.nseindia.com" },
  { id: "bse", name: "BSE India", tier: "primary", role: "Exchange filings, disclosures and corporate actions", reliability: 1, homepage: "https://www.bseindia.com" },
  { id: "investor-relations", name: "Company Investor Relations", tier: "primary", role: "Company-issued results, presentations and disclosures", reliability: 0.95, homepage: null },
  { id: "crisil", name: "CRISIL Ratings", tier: "rating", role: "Credit ratings and rating rationale", reliability: 0.95, homepage: "https://www.crisilratings.com" },
  { id: "icra", name: "ICRA", tier: "rating", role: "Credit ratings and rating rationale", reliability: 0.95, homepage: "https://www.icra.in" },
  { id: "care", name: "CARE Ratings", tier: "rating", role: "Credit ratings and rating rationale", reliability: 0.95, homepage: "https://www.careratings.com" },
  { id: "india-ratings", name: "India Ratings & Research", tier: "rating", role: "Credit ratings and research", reliability: 0.95, homepage: "https://www.indiaratings.co.in" },
  { id: "brickwork", name: "Brickwork Ratings", tier: "rating", role: "Credit ratings and rating rationale", reliability: 0.9, homepage: "https://www.brickworkratings.com" },
  { id: "reuters", name: "Reuters", tier: "wire", role: "Independent market and company reporting", reliability: 0.92, homepage: "https://www.reuters.com" },
  { id: "moneycontrol", name: "Moneycontrol", tier: "publisher", role: "Indian market news and company coverage", reliability: 0.82, homepage: "https://www.moneycontrol.com" },
  { id: "economic-times", name: "Economic Times", tier: "publisher", role: "Business and market reporting", reliability: 0.82, homepage: "https://economictimes.indiatimes.com" },
  { id: "business-standard", name: "Business Standard", tier: "publisher", role: "Business and market reporting", reliability: 0.82, homepage: "https://www.business-standard.com" },
  { id: "livemint", name: "LiveMint", tier: "publisher", role: "Business, policy and market reporting", reliability: 0.8, homepage: "https://www.livemint.com" },
  { id: "google-news", name: "Google News", tier: "aggregator", role: "Discovery and cross-source corroboration", reliability: 0.6, homepage: "https://news.google.com" },
];

const tierLabel: Record<SourceTier, string> = {
  primary: "Primary / Official",
  rating: "Rating Agencies",
  wire: "Independent Wire",
  publisher: "Trusted Publishers",
  aggregator: "Discovery / Aggregator",
};

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function sourceMatches(catalog: SourceCatalogItem, source: AISource): boolean {
  const a = normalise(catalog.name);
  const b = normalise(source.name);
  const id = normalise(source.id);
  return b === a || b.includes(a) || a.includes(b) || id === normalise(catalog.id) || id.includes(normalise(catalog.id));
}

export type SourceIntelligenceRow = SourceCatalogItem & {
  connected: boolean;
  evidenceCount: number;
  latestObservedAt: string | null;
};

export function buildSourceIntelligence(answer: AIAnswer): SourceIntelligenceRow[] {
  return TRUSTED_SOURCE_CATALOG.map((catalog) => {
    const matches = answer.sources.filter((source) => sourceMatches(catalog, source));
    return {
      ...catalog,
      connected: matches.length > 0,
      evidenceCount: matches.length,
      latestObservedAt: matches.map((source) => source.observedAt).filter(Boolean).sort().at(-1) ?? null,
    };
  });
}

export function sourceTierLabel(tier: SourceTier): string {
  return tierLabel[tier];
}

export function answerSourceStats(answer: AIAnswer) {
  const rows = buildSourceIntelligence(answer);
  const connected = rows.filter((row) => row.connected);
  return {
    totalConnected: connected.length,
    primary: connected.filter((row) => row.tier === "primary").length,
    rating: connected.filter((row) => row.tier === "rating").length,
    independent: connected.filter((row) => row.tier === "wire" || row.tier === "publisher").length,
    aggregator: connected.filter((row) => row.tier === "aggregator").length,
  };
}
