import { AppError } from "./errors";

/** Storage for fixed-window counters. Returns the count after incrementing. */
export interface RateLimitStore {
  hit(key: string, windowMs: number, now: number): Promise<number>;
}

export interface RateLimitRule {
  name: string;
  limit: number;
  windowMs: number;
}

export class RateLimiter {
  constructor(
    private readonly store: RateLimitStore,
    private readonly clock: () => number = Date.now,
  ) {}

  /** Throws RATE_LIMITED when `identity` exceeded `rule` in the current window. */
  async check(rule: RateLimitRule, identity: string): Promise<void> {
    const now = this.clock();
    const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;
    const key = `${rule.name}:${identity}:${windowStart}`;
    const count = await this.store.hit(key, rule.windowMs, now);
    if (count > rule.limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((windowStart + rule.windowMs - now) / 1000));
      throw new AppError("RATE_LIMITED", `Too many requests. Try again in ${retryAfterSeconds} seconds.`, {
        retryAfterSeconds,
      });
    }
  }
}

/** Per-instance store for local development and tests. */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly counts = new Map<string, { count: number; expiresAt: number }>();

  async hit(key: string, windowMs: number, now: number): Promise<number> {
    for (const [k, v] of this.counts) if (v.expiresAt <= now) this.counts.delete(k);
    const entry = this.counts.get(key) ?? { count: 0, expiresAt: now + windowMs };
    entry.count += 1;
    this.counts.set(key, entry);
    return entry.count;
  }
}
