import "server-only";
import { getConfig } from "@/server/env";
import { getExecutionProvider } from "@/server/execution";
import { mongoRateLimitStore } from "@/server/repositories/rate-limit.repository";
import { snippetsRepository } from "@/server/repositories/snippets.repository";
import { usageRepository } from "@/server/repositories/usage.repository";
import { getClientIp, hashIdentifier } from "@/server/security/ip";
import { MemoryRateLimitStore, RateLimiter } from "@/server/security/rate-limit";
import { getSessionUser } from "./auth";
import { anonymousIdentity, userIdentity, type Identity } from "./services/identity";
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

export function getRunService() {
  runService ??= createRunService({
    provider: getExecutionProvider(),
    rateLimiter: rateLimiter(),
    recordUsage: getConfig().features.database
      ? (e) => usageRepository.record({ type: "run", language: "java", status: e.status, durationMs: e.durationMs })
      : undefined,
  });
  return runService;
}

export function getSnippetService() {
  snippetService ??= createSnippetService({ repository: snippetsRepository, rateLimiter: rateLimiter() });
  return snippetService;
}

export async function resolveIdentity(request: Request): Promise<Identity> {
  const user = await getSessionUser();
  if (user) return userIdentity(user.id);
  return anonymousIdentity(hashIdentifier(getClientIp(request.headers), getConfig().ipHashSalt));
}
