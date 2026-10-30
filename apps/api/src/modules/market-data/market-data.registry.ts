import type {
  MarketDataCapability,
  MarketDataProvider,
  MarketDataProviderId,
  ProviderMetadata,
} from "./market-data.types";
import { RateLimiter } from "./rate-limiter";

export type ProviderHealth = {
  providerId: MarketDataProviderId;
  successes: number;
  failures: number;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  lastError: string | null;
  lastErrorCode: string | null;
};

/**
 * Providers register once (see market-data.providers.ts). The registry owns each provider's
 * limiter and health record. Adding a provider is one adapter plus one `register` call.
 */
export class MarketDataRegistry {
  private readonly providers = new Map<MarketDataProviderId, MarketDataProvider>();
  private readonly limiters = new Map<MarketDataProviderId, RateLimiter>();
  private readonly healthRecords = new Map<MarketDataProviderId, ProviderHealth>();

  constructor(private readonly clock: () => number = Date.now) {}

  register(provider: MarketDataProvider): this {
    const { id, rateLimits } = provider.metadata;
    this.providers.set(id, provider);
    this.limiters.set(id, new RateLimiter(rateLimits, this.clock));
    this.healthRecords.set(id, {
      providerId: id,
      successes: 0,
      failures: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastError: null,
      lastErrorCode: null,
    });
    return this;
  }

  get(id: MarketDataProviderId): MarketDataProvider | undefined {
    return this.providers.get(id);
  }

  limiter(id: MarketDataProviderId): RateLimiter | undefined {
    return this.limiters.get(id);
  }

  /** Applies the premium limits when the household flags its key as premium. */
  applyPremium(id: MarketDataProviderId, premium: boolean): void {
    const meta = this.providers.get(id)?.metadata;
    if (!meta) return;
    this.limiters
      .get(id)
      ?.setLimits(premium && meta.premiumRateLimits ? meta.premiumRateLimits : meta.rateLimits);
  }

  list(): ProviderMetadata[] {
    return [...this.providers.values()]
      .map((provider) => provider.metadata)
      .sort((a, b) => a.priority - b.priority);
  }

  supporting(capability: MarketDataCapability): MarketDataProviderId[] {
    return this.list()
      .filter((meta) => meta.capabilities.includes(capability))
      .map((meta) => meta.id);
  }

  health(): ProviderHealth[] {
    return [...this.healthRecords.values()];
  }

  recordSuccess(id: MarketDataProviderId): void {
    const record = this.healthRecords.get(id);
    if (!record) return;
    record.successes += 1;
    record.lastSuccessAt = new Date(this.clock());
  }

  recordFailure(id: MarketDataProviderId, code: string, message: string): void {
    const record = this.healthRecords.get(id);
    if (!record) return;
    record.failures += 1;
    record.lastFailureAt = new Date(this.clock());
    record.lastError = message;
    record.lastErrorCode = code;
  }
}
