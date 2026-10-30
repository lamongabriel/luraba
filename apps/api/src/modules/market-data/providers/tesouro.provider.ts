import {
  type FixedIncomePriceProvider,
  type HttpFetch,
  type MarketDataProvider,
  type ProviderMetadata,
  ProviderUnavailableError,
  type TreasuryPrice,
} from "../market-data.types";
import { assertHttpOk, brNumber, defaultFetch, fromBrDate } from "./http";

/** Tesouro Transparente price/rate history CSV (verify the resource URL when the portal changes). */
export const TESOURO_CSV_URL =
  "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv";

const orNull = (value: string | undefined): string | null => (value ? brNumber(value) : null);

/** Parses the semicolon CSV and returns the rows of the most recent base date. */
export function parseTesouroCsv(csv: string): TreasuryPrice[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const rows: TreasuryPrice[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(";");
    if (cols.length < 8 || !cols[2]) continue;
    rows.push({
      title: cols[0] as string,
      maturityDate: fromBrDate(cols[1] as string),
      date: fromBrDate(cols[2]),
      buyYield: orNull(cols[3]),
      sellYield: orNull(cols[4]),
      buyPrice: orNull(cols[5]),
      sellPrice: orNull(cols[6]),
      basePrice: orNull(cols[7]),
    });
  }
  const latest = rows.reduce((max, row) => (row.date > max ? row.date : max), "");
  return rows.filter((row) => row.date === latest);
}

export class TesouroProvider implements MarketDataProvider, FixedIncomePriceProvider {
  readonly metadata: ProviderMetadata = {
    id: "tesouro",
    name: "Tesouro Transparente",
    capabilities: ["fixedIncomePrices"],
    markets: ["BR"],
    assetClasses: ["TESOURO_DIRETO"],
    rateLimits: { perMinute: 6 },
    requiresApiKey: false,
    freshness: "eod",
    priority: 10,
  };

  constructor(private readonly http: HttpFetch = defaultFetch) {}

  async getTreasuryPrices(): Promise<TreasuryPrice[]> {
    const response = await this.http(TESOURO_CSV_URL);
    assertHttpOk(response, "tesouro", "price file");
    const prices = parseTesouroCsv(await response.text());
    if (prices.length === 0)
      throw new ProviderUnavailableError("Tesouro CSV had no rows", "tesouro");
    return prices;
  }
}
