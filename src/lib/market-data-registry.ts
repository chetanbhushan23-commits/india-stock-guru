export type Exchange = "NSE" | "BSE";

export type Instrument = {
  symbol: string;
  exchange: Exchange;
  name: string;
  isin?: string;
  aliases: string[];
};

/** Canonical registry boundary for exchange instruments. Provider adapters should consume this normalized shape. */
export function normalizeInstrumentQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toUpperCase();
}

export function normalizeExchangeSymbol(symbol: string, exchange: Exchange): string {
  const clean = symbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, "");
  return exchange === "NSE" ? `${clean}.NS` : `${clean}.BO`;
}

export function rankInstrumentMatch(instrument: Instrument, query: string): number {
  const q = normalizeInstrumentQuery(query);
  const name = normalizeInstrumentQuery(instrument.name);
  const symbol = normalizeInstrumentQuery(instrument.symbol);
  const aliases = instrument.aliases.map(normalizeInstrumentQuery);
  if (symbol === q) return 100;
  if (name === q) return 95;
  if (aliases.includes(q)) return 92;
  if (symbol.startsWith(q)) return 80;
  if (name.startsWith(q)) return 75;
  if (aliases.some((a) => a.startsWith(q))) return 70;
  if (name.includes(q)) return 60;
  if (aliases.some((a) => a.includes(q))) return 55;
  return 0;
}

export function validateInstrument(instrument: Instrument): boolean {
  return Boolean(instrument.symbol && instrument.name && instrument.exchange);
}
