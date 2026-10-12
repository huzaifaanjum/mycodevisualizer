import { AppError } from "./errors";
import { MemoryRateLimitStore, RateLimiter } from "./rate-limit";

describe("RateLimiter", () => {
  const rule = { name: "runs", limit: 2, windowMs: 60_000 };

  it("allows requests up to the limit and then rejects with retry-after", async () => {
    let now = 120_000;
    const limiter = new RateLimiter(new MemoryRateLimitStore(), () => now);
    await limiter.check(rule, "ip1");
    await limiter.check(rule, "ip1");
    now += 15_000;
    const error = await limiter.check(rule, "ip1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("RATE_LIMITED");
    expect((error as AppError).options.retryAfterSeconds).toBe(45);
  });

  it("tracks identities separately and resets each window", async () => {
    let now = 0;
    const limiter = new RateLimiter(new MemoryRateLimitStore(), () => now);
    await limiter.check(rule, "a");
    await limiter.check(rule, "a");
    await expect(limiter.check(rule, "b")).resolves.toBeUndefined();
    now = 60_000;
    await expect(limiter.check(rule, "a")).resolves.toBeUndefined();
  });
});
