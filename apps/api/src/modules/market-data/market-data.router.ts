import { MARKET_DATA_FORCE_MOCK, MARKET_DATA_ROUTES } from "@/config/market-data";
import { logger } from "@/shared/logger";
import type { MarketDataRegistry } from "./market-data.registry";
import {
  type MarketDataCapability,
  MarketDataError,
  type MarketDataProvider,
  type MarketDataProviderId,
  ProviderTimeoutError,
  ProviderUnavailableError,
  type RequestContext,
} from "./market-data.types";

export type RouteOptions = {
  /** Providers the household moved to the front, in order. */
  preferred?: readonly MarketDataProviderId[];
  /** Providers the household switched off. */
  disabled?: ReadonlySet<MarketDataProviderId>;
  /** Per-provider request context (own API key, premium flag). */
  contextFor?: (id: MarketDataProviderId) => RequestContext | undefined;
  timeoutMs?: number;
};

export type RouteResult<T> = { value: T; provider: MarketDataProviderId; attempts: RouteAttempt[] };
export type RouteAttempt = {
  provider: MarketDataProviderId;
  ok: boolean;
  code?: string;
  message?: string;
};

function withTimeout<T>(promise: Promise<T>, ms: number, provider: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new ProviderTimeoutError(`${provider} timed out after ${ms}ms`, provider)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Picks the provider for (capability, market) from config, walks the fallback chain on typed
 * errors (rate limit, premium required, not found, timeout, unavailable) and logs each fallback.
 * Concurrent identical requests share one in-flight call.
 */
export class MarketDataRouter {
  private readonly inflight = new Map<string, Promise<RouteResult<unknown>>>();

  constructor(
    private readonly registry: MarketDataRegistry,
    private readonly defaultTimeoutMs = 8000,
  ) {}

  orderFor(
    capability: MarketDataCapability,
    market: string,
    options: RouteOptions = {},
  ): MarketDataProviderId[] {
    const routes = MARKET_DATA_ROUTES[capability];
    const configured = [...(routes[market] ?? routes["*"] ?? [])];
    const base = MARKET_DATA_FORCE_MOCK ? (["mock"] as MarketDataProviderId[]) : configured;
    const preferred = (options.preferred ?? []).filter((id) =>
      this.registry.get(id)?.metadata.capabilities.includes(capability),
    );
    const ordered = [...new Set([...preferred, ...base])];
    return ordered.filter((id) => {
      const provider = this.registry.get(id);
      return provider?.metadata.capabilities.includes(capability) && !options.disabled?.has(id);
    });
  }

  /**
   * Runs `call` against each candidate until one succeeds. `coalesceKey` (for example
   * `quote:PETR4`) makes concurrent identical requests share one outcome.
   */
  async run<T>(
    capability: MarketDataCapability,
    market: string,
    call: (provider: MarketDataProvider, ctx: RequestContext | undefined) => Promise<T>,
    options: RouteOptions & { coalesceKey?: string } = {},
  ): Promise<RouteResult<T>> {
    const key = options.coalesceKey ? `${capability}|${market}|${options.coalesceKey}` : undefined;
    if (key) {
      const existing = this.inflight.get(key);
      if (existing) return existing as Promise<RouteResult<T>>;
    }
    const promise = this.execute(capability, market, call, options);
    if (key) {
      this.inflight.set(key, promise as Promise<RouteResult<unknown>>);
      promise.finally(() => this.inflight.delete(key)).catch(() => undefined);
    }
    return promise;
  }

  private async execute<T>(
    capability: MarketDataCapability,
    market: string,
    call: (provider: MarketDataProvider, ctx: RequestContext | undefined) => Promise<T>,
    options: RouteOptions,
  ): Promise<RouteResult<T>> {
    const candidates = this.orderFor(capability, market, options);
    const attempts: RouteAttempt[] = [];
    let lastError: unknown;

    for (const id of candidates) {
      const provider = this.registry.get(id) as MarketDataProvider;
      const limiter = this.registry.limiter(id);
      if (limiter && !limiter.tryAcquire()) {
        attempts.push({
          provider: id,
          ok: false,
          code: "RATE_LIMITED",
          message: "Local limiter exhausted",
        });
        logger.info(
          { provider: id, capability, market },
          "[market-data] skipped: local rate limit",
        );
        continue;
      }
      const ctx = options.contextFor?.(id);
      if (provider.metadata.requiresApiKey && !ctx?.apiKey) {
        attempts.push({
          provider: id,
          ok: false,
          code: "UNAVAILABLE",
          message: "No API key configured",
        });
        continue;
      }
      try {
        const value = await withTimeout(
          call(provider, ctx),
          options.timeoutMs ?? this.defaultTimeoutMs,
          id,
        );
        this.registry.recordSuccess(id);
        attempts.push({ provider: id, ok: true });
        return { value, provider: id, attempts };
      } catch (error) {
        const typed =
          error instanceof MarketDataError
            ? error
            : new ProviderUnavailableError(
                error instanceof Error ? error.message : String(error),
                id,
              );
        lastError = typed;
        if (typed.code === "RATE_LIMITED") limiter?.exhaustDay();
        this.registry.recordFailure(id, typed.code, typed.message);
        attempts.push({ provider: id, ok: false, code: typed.code, message: typed.message });
        logger.warn(
          { provider: id, capability, market, code: typed.code, message: typed.message },
          "[market-data] provider failed, trying the next one",
        );
      }
    }

    if (lastError instanceof MarketDataError) {
      throw new MarketDataRouteError(lastError, attempts);
    }
    throw new MarketDataRouteError(
      new ProviderUnavailableError(`No provider available for ${capability} in ${market}`),
      attempts,
    );
  }
}

export class MarketDataRouteError extends MarketDataError {
  constructor(
    readonly last: MarketDataError,
    readonly attempts: RouteAttempt[],
  ) {
    super(last.code, last.message, last.provider);
    this.name = "MarketDataRouteError";
  }
}
