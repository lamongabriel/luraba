export type RateLimits = { perMinute?: number; perDay?: number };

/**
 * Token-bucket limiter per provider with two windows. Tokens refill continuously for the minute
 * bucket and reset on the UTC day for the daily bucket. The clock is injectable for tests.
 */
export class RateLimiter {
  private minuteTokens: number;
  private lastRefill: number;
  private dayCount = 0;
  private dayKey: string;

  constructor(
    private limits: RateLimits,
    private readonly clock: () => number = Date.now,
  ) {
    this.minuteTokens = limits.perMinute ?? Number.POSITIVE_INFINITY;
    this.lastRefill = clock();
    this.dayKey = new Date(clock()).toISOString().slice(0, 10);
  }

  setLimits(limits: RateLimits): void {
    this.limits = limits;
    this.minuteTokens = Math.min(this.minuteTokens, limits.perMinute ?? Number.POSITIVE_INFINITY);
  }

  private refill(): void {
    const now = this.clock();
    const today = new Date(now).toISOString().slice(0, 10);
    if (today !== this.dayKey) {
      this.dayKey = today;
      this.dayCount = 0;
    }
    const perMinute = this.limits.perMinute;
    if (perMinute !== undefined) {
      const elapsed = (now - this.lastRefill) / 60_000;
      this.minuteTokens = Math.min(perMinute, this.minuteTokens + elapsed * perMinute);
    }
    this.lastRefill = now;
  }

  /** Takes a token when available; false means the caller must skip this provider. */
  tryAcquire(): boolean {
    this.refill();
    if (this.limits.perDay !== undefined && this.dayCount >= this.limits.perDay) return false;
    if (this.limits.perMinute !== undefined && this.minuteTokens < 1) return false;
    if (this.limits.perMinute !== undefined) this.minuteTokens -= 1;
    this.dayCount += 1;
    return true;
  }

  /** Marks the provider exhausted for the day after it reported a rate limit itself. */
  exhaustDay(): void {
    if (this.limits.perDay !== undefined) this.dayCount = this.limits.perDay;
  }

  remainingToday(): number | null {
    this.refill();
    return this.limits.perDay === undefined
      ? null
      : Math.max(0, this.limits.perDay - this.dayCount);
  }
}
