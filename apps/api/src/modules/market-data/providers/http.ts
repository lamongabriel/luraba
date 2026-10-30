import {
  type HttpFetch,
  ProviderUnavailableError,
  RateLimitedError,
  SymbolNotFoundError,
} from "../market-data.types";

export const defaultFetch: HttpFetch = (input, init) => fetch(input, init as RequestInit);

/** Maps generic HTTP failures onto the typed provider errors the router understands. */
export function assertHttpOk(
  response: { ok: boolean; status: number },
  provider: string,
  what: string,
): void {
  if (response.ok) return;
  if (response.status === 429)
    throw new RateLimitedError(`${provider} rate limit (HTTP 429) on ${what}`, provider);
  if (response.status === 404)
    throw new SymbolNotFoundError(`${provider} has no data for ${what}`, provider);
  throw new ProviderUnavailableError(
    `${provider} returned HTTP ${response.status} for ${what}`,
    provider,
  );
}

/** `YYYY-MM-DD` to `DD/MM/YYYY` (BCB). */
export function toBrDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** `DD/MM/YYYY` to `YYYY-MM-DD`. */
export function fromBrDate(value: string): string {
  const [d, m, y] = value.split("/");
  return `${y}-${m}-${d}`;
}

/** Decimal string with `,` as separator to a plain decimal string. */
export function brNumber(value: string): string {
  return value.trim().replace(/\./g, "").replace(",", ".");
}
