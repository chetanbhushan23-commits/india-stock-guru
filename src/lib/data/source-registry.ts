export type SourceTier = "A" | "B" | "C";

export type MarketSource = {
  id: string;
  name: string;
  tier: SourceTier;
  roles: readonly ("quote" | "history" | "filing" | "fundamental" | "news" | "verification")[];
  requiresApiKey: boolean;
  enabledByDefault: boolean;
};

/**
 * Source registry for the free-first grounded research pipeline.
 * This is metadata only: collection adapters must still enforce each
 * provider's terms, rate limits and availability.
 */
export const MARKET_SOURCE_REGISTRY: readonly MarketSource[] = [
  {
    id: "nse",
    name: "NSE India",
    tier: "A",
    roles: ["quote", "history", "filing", "verification"],
    requiresApiKey: false,
    enabledByDefault: true,
  },
  {
    id: "bse",
    name: "BSE India",
    tier: "A",
    roles: ["quote", "history", "filing", "verification"],
    requiresApiKey: false,
    enabledByDefault: true,
  },
  {
    id: "sebi",
    name: "SEBI",
    tier: "A",
    roles: ["filing", "verification"],
    requiresApiKey: false,
    enabledByDefault: true,
  },
  {
    id: "rbi",
    name: "RBI",
    tier: "A",
    roles: ["filing", "verification", "news"],
    requiresApiKey: false,
    enabledByDefault: true,
  },
  {
    id: "company-ir",
    name: "Company Investor Relations",
    tier: "A",
    roles: ["filing", "fundamental", "verification", "news"],
    requiresApiKey: false,
    enabledByDefault: true,
  },
  {
    id: "yahoo-finance",
    name: "Yahoo Finance",
    tier: "B",
    roles: ["quote", "history", "news"],
    requiresApiKey: false,
    enabledByDefault: true,
  },
  {
    id: "screener",
    name: "Screener",
    tier: "B",
    roles: ["fundamental"],
    requiresApiKey: false,
    enabledByDefault: true,
  },
  {
    id: "tradingview",
    name: "TradingView",
    tier: "B",
    roles: ["quote", "history"],
    requiresApiKey: false,
    enabledByDefault: false,
  },
  {
    id: "moneycontrol",
    name: "Moneycontrol",
    tier: "B",
    roles: ["news", "fundamental"],
    requiresApiKey: false,
    enabledByDefault: false,
  },
  {
    id: "economic-times",
    name: "Economic Times Markets",
    tier: "B",
    roles: ["news"],
    requiresApiKey: false,
    enabledByDefault: false,
  },
  {
    id: "livemint",
    name: "Livemint",
    tier: "B",
    roles: ["news"],
    requiresApiKey: false,
    enabledByDefault: false,
  },
  {
    id: "twelve-data",
    name: "Twelve Data",
    tier: "B",
    roles: ["quote", "history"],
    requiresApiKey: true,
    enabledByDefault: false,
  },
];

export function getEnabledSources(): readonly MarketSource[] {
  return MARKET_SOURCE_REGISTRY.filter((source) => source.enabledByDefault);
}

export function getSourcesForRole(
  role: MarketSource["roles"][number],
): readonly MarketSource[] {
  return MARKET_SOURCE_REGISTRY.filter((source) => source.roles.includes(role));
}
