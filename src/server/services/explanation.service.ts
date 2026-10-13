import "server-only";
import { createHash } from "node:crypto";
import type { CodeExplanation, ExplainRequest } from "@/shared/api";
import { RATE_LIMITS } from "@/shared/constants";
import type { ExplanationProvider } from "@/server/explanation/groq.provider";
import type { RateLimiter } from "@/server/security/rate-limit";
import type { Identity } from "./identity";

export interface ExplanationServiceDeps {
  provider: ExplanationProvider;
  rateLimiter: RateLimiter;
  rateLimitMultiplier?: number;
  /** Explanations kept in memory; examples are shared by everyone, so they are explained once. */
  cacheEntries?: number;
}

/**
 * AI line-by-line explanations of a program. The same code, input and context are explained once
 * per instance and then served from an LRU cache; only cache misses count against rate limits.
 */
export function createExplanationService({ provider, rateLimiter, rateLimitMultiplier = 1, cacheEntries = 200 }: ExplanationServiceDeps) {
  const cache = new Map<string, CodeExplanation>();
  const inFlight = new Map<string, Promise<CodeExplanation>>();

  return {
    async explain(input: ExplainRequest, identity: Identity): Promise<CodeExplanation> {
      const key = createHash("sha256")
        .update(JSON.stringify([provider.cacheKey, input.language, input.code, input.stdin, input.context ?? null]))
        .digest("hex");
      const hit = cache.get(key);
      if (hit) {
        cache.delete(key);
        cache.set(key, hit);
        return hit;
      }
      const pending = inFlight.get(key);
      if (pending) return pending;

      const perHour =
        identity.kind === "user" ? RATE_LIMITS.explanationsPerHourSignedIn : RATE_LIMITS.explanationsPerHourAnonymous;
      // Registered before the first await, so identical requests arriving together share one model call.
      const request = rateLimiter
        .check({ name: "explanations", limit: perHour * rateLimitMultiplier, windowMs: 3_600_000 }, identity.key)
        .then(() => provider.explain(input))
        .then((explanation) => {
          cache.set(key, explanation);
          while (cache.size > cacheEntries) {
            const oldest = cache.keys().next().value;
            if (oldest === undefined) break;
            cache.delete(oldest);
          }
          return explanation;
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
