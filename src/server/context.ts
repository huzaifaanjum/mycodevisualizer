import "server-only";
import { getConfig } from "@/server/env";
import { getExecutionProvider } from "@/server/execution";
import { createElevenLabsProvider } from "@/server/narration/elevenlabs.provider";
import { mongoRateLimitStore } from "@/server/repositories/rate-limit.repository";
import { snippetsRepository } from "@/server/repositories/snippets.repository";
import { usageRepository } from "@/server/repositories/usage.repository";
import { getClientIp, hashIdentifier } from "@/server/security/ip";
import { AppError } from "@/server/security/errors";
import { MemoryRateLimitStore, RateLimiter } from "@/server/security/rate-limit";
import { getSessionUser } from "./auth";
import { anonymousIdentity, userIdentity, type Identity } from "./services/identity";
import { createNarrationService } from "./services/narration.service";
import { createRunService } from "./services/run.service";
import { createSnippetService } from "./services/snippet.service";

/**
 * Composition root: wires repositories, providers and services together once per instance.
 * Route handlers depend only on what this module exports.
 */
const memoryStore = new MemoryRateLimitStore();

function rateLimiter(): RateLimiter {
  return new RateLimiter(getConfig().features.database ? mongoRateLimitStore : memoryStore);
}

let runService: ReturnType<typeof createRunService> | undefined;
let snippetService: ReturnType<typeof createSnippetService> | undefined;
let narrationService: ReturnType<typeof createNarrationService> | undefined;

export function getRunService() {
  runService ??= createRunService({
    provider: getExecutionProvider(),
    rateLimiter: rateLimiter(),
    rateLimitMultiplier: getConfig().env.RATE_LIMIT_MULTIPLIER,
    recordUsage: getConfig().features.database
      ? (e) => usageRepository.record({
          type: "run",
          language: "java",
          status: e.status,
          durationMs: e.durationMs,
          ...(e.reason && { reason: e.reason }),
        })
      : undefined,
  });
  return runService;
}

export function getSnippetService() {
  snippetService ??= createSnippetService({
    repository: snippetsRepository,
    rateLimiter: rateLimiter(),
    rateLimitMultiplier: getConfig().env.RATE_LIMIT_MULTIPLIER,
  });
  return snippetService;
}

export function getNarrationService() {
  const { env } = getConfig();
  if (!env.ELEVENLABS_API_KEY) throw new AppError("SERVICE_UNAVAILABLE", "Narration isn't set up on this site.");
  narrationService ??= createNarrationService({
    provider: createElevenLabsProvider({
      apiKey: env.ELEVENLABS_API_KEY,
      voiceId: env.ELEVENLABS_VOICE_ID,
      modelId: env.ELEVENLABS_MODEL_ID,
    }),
    rateLimiter: rateLimiter(),
    rateLimitMultiplier: env.RATE_LIMIT_MULTIPLIER,
  });
  return narrationService;
}

export async function resolveIdentity(request: Request): Promise<Identity> {
  const user = await getSessionUser();
  if (user) return userIdentity(user.id);
  return anonymousIdentity(hashIdentifier(getClientIp(request.headers), getConfig().ipHashSalt));
}
