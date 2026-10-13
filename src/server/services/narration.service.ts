import "server-only";
import { createHash } from "node:crypto";
import type { NarrationRequest } from "@/shared/api";
import { RATE_LIMITS } from "@/shared/constants";
import type { SpeechProvider } from "@/server/narration/elevenlabs.provider";
import type { RateLimiter } from "@/server/security/rate-limit";
import type { Identity } from "./identity";

export interface NarrationServiceDeps {
  provider: SpeechProvider;
  rateLimiter: RateLimiter;
  rateLimitMultiplier?: number;
  /** Clips kept in memory. Step notes repeat a lot ("Next, line 5 runs."), so most requests hit it. */
  cacheEntries?: number;
}

/**
 * Speaks short texts aloud. Identical text is synthesized once per instance and then served from
 * an in-memory LRU cache; only cache misses count against the caller's rate limit.
 */
export function createNarrationService({ provider, rateLimiter, rateLimitMultiplier = 1, cacheEntries = 300 }: NarrationServiceDeps) {
  const cache = new Map<string, Uint8Array>();
  const inFlight = new Map<string, Promise<Uint8Array>>();

  const remember = (key: string, audio: Uint8Array) => {
    cache.set(key, audio);
    while (cache.size > cacheEntries) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  };

  return {
    async speak(input: NarrationRequest, identity: Identity): Promise<Uint8Array> {
      const key = createHash("sha256").update(`${provider.voiceKey}\n${input.text}`).digest("hex");
      const hit = cache.get(key);
      if (hit) {
        // Re-insert so the most recently used clips survive eviction.
        cache.delete(key);
        cache.set(key, hit);
        return hit;
      }
      const pending = inFlight.get(key);
      if (pending) return pending;

      const perMinute =
        identity.kind === "user" ? RATE_LIMITS.narrationsPerMinuteSignedIn : RATE_LIMITS.narrationsPerMinuteAnonymous;
      // Registered before the first await, so identical requests arriving together share one upstream call.
      const request = rateLimiter
        .check({ name: "narration", limit: perMinute * rateLimitMultiplier, windowMs: 60_000 }, identity.key)
        .then(() => provider.synthesize(input.text))
        .then((audio) => {
          remember(key, audio);
          return audio;
        });
      inFlight.set(key, request);
      try {
        return await request;
      } finally {
        inFlight.delete(key);
      }
    },
  };
}
