import {
  type HttpFetch,
  type MacroIndexProvider,
  type MacroPoint,
  type MacroSeriesId,
  type MarketDataProvider,
  type ProviderMetadata,
  ProviderUnavailableError,
  SymbolNotFoundError,
} from "../market-data.types";
import { assertHttpOk, defaultFetch, fromBrDate, toBrDate } from "./http";

/** BCB SGS series codes (verify against https://www3.bcb.gov.br/sgspub). */
export const BCB_SERIES_CODES: Partial<Record<MacroSeriesId, number>> = {
  CDI_DAILY: 12,
  SELIC_DAILY: 11,
  SELIC_TARGET: 432,
  IPCA_MONTHLY: 433,
  IGPM_MONTHLY: 189,
};

const TEN_YEARS_DAYS = 3650;
const BCB_ATTEMPTS = 3;

type BcbRow = { data: string; valor: string };

export class BcbProvider implements MarketDataProvider, MacroIndexProvider {
  readonly metadata: ProviderMetadata = {
    id: "bcb",
    name: "Banco Central do Brasil (SGS)",
    capabilities: ["macro"],
    markets: ["BR"],
    assetClasses: [],
    rateLimits: { perMinute: 60 },
    requiresApiKey: false,
    freshness: "eod",
    priority: 10,
  };

  constructor(private readonly http: HttpFetch = defaultFetch) {}

  async getSeries(series: MacroSeriesId, from: string, to: string): Promise<MacroPoint[]> {
    const code = BCB_SERIES_CODES[series];
    if (!code) throw new SymbolNotFoundError(`BCB SGS has no series ${series}`, "bcb");
    const points: MacroPoint[] = [];
    // Daily series are limited to 10-year windows per request.
    for (let start = from; start <= to; ) {
      const endMs = Math.min(
        Date.parse(`${start}T00:00:00Z`) + TEN_YEARS_DAYS * 86_400_000,
        Date.parse(`${to}T00:00:00Z`),
      );
      const end = new Date(endMs).toISOString().slice(0, 10);
      // The API rejects a window whose end is not after its start, so ask for the day before.
      const requestStart =
        end > start
          ? start
          : new Date(Date.parse(`${start}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
      const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${toBrDate(requestStart)}&dataFinal=${toBrDate(end)}`;
      const rows = await this.fetchWindow(url, series);
      for (const row of rows) {
        const date = fromBrDate(row.data);
        if (date >= start) points.push({ date, value: row.valor });
      }
      start = new Date(endMs + 86_400_000).toISOString().slice(0, 10);
    }
    return points;
  }

  /** The BCB gateway intermittently answers 502 or an XML error page, so retry a few times. */
  private async fetchWindow(url: string, series: MacroSeriesId): Promise<BcbRow[]> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= BCB_ATTEMPTS; attempt++) {
      try {
        const response = await this.http(url);
        assertHttpOk(response, "bcb", `series ${series}`);
        const body = await response.text();
        if (!body.trimStart().startsWith("[")) {
          throw new ProviderUnavailableError(`BCB returned a non-JSON body for ${series}`, "bcb");
        }
        return JSON.parse(body) as BcbRow[];
      } catch (error) {
        lastError = error;
        if (error instanceof SymbolNotFoundError || attempt === BCB_ATTEMPTS) break;
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
    throw lastError;
  }
}
