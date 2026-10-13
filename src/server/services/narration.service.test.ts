import type { SpeechProvider } from "@/server/narration/elevenlabs.provider";
import { AppError } from "@/server/security/errors";
import { MemoryRateLimitStore, RateLimiter } from "@/server/security/rate-limit";
import { RATE_LIMITS } from "@/shared/constants";
import { anonymousIdentity } from "./identity";
import { createNarrationService } from "./narration.service";

function fakeProvider(): SpeechProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    voiceKey: "fake",
    calls,
    synthesize: async (text) => {
      calls.push(text);
      return new TextEncoder().encode(`audio:${text}`);
    },
  };
}

const anon = anonymousIdentity("ip");

describe("narration service", () => {
  const make = (provider: SpeechProvider, cacheEntries?: number) =>
    createNarrationService({ provider, rateLimiter: new RateLimiter(new MemoryRateLimitStore()), cacheEntries });

  it("synthesizes text once and serves repeats from the cache", async () => {
    const provider = fakeProvider();
    const service = make(provider);
    const first = await service.speak({ text: "Next, line 5 runs." }, anon);
    const second = await service.speak({ text: "Next, line 5 runs." }, anon);
    expect(second).toEqual(first);
    expect(provider.calls).toEqual(["Next, line 5 runs."]);
  });

  it("shares one upstream request between identical requests in flight", async () => {
    const provider = fakeProvider();
    const service = make(provider);
    await Promise.all([service.speak({ text: "Hi" }, anon), service.speak({ text: "Hi" }, anon)]);
    expect(provider.calls).toHaveLength(1);
  });

  it("evicts the least recently used clip when the cache is full", async () => {
    const provider = fakeProvider();
    const service = make(provider, 2);
    await service.speak({ text: "a" }, anon);
    await service.speak({ text: "b" }, anon);
    await service.speak({ text: "a" }, anon); // a is now the most recent
    await service.speak({ text: "c" }, anon); // evicts b
    await service.speak({ text: "a" }, anon);
    await service.speak({ text: "b" }, anon);
    expect(provider.calls).toEqual(["a", "b", "c", "b"]);
  });

  it("rate limits cache misses but never cache hits", async () => {
    const provider = fakeProvider();
    const service = make(provider);
    const limit = RATE_LIMITS.narrationsPerMinuteAnonymous;
    for (let i = 0; i < limit; i++) await service.speak({ text: `note ${i}` }, anon);
    await expect(service.speak({ text: "one too many" }, anon)).rejects.toBeInstanceOf(AppError);
    await expect(service.speak({ text: "note 0" }, anon)).resolves.toBeDefined();
  });
});
