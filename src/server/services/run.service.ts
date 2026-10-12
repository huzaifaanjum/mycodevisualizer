import "server-only";
import { getLanguageAdapter } from "@/languages";
import type { RunRequest } from "@/shared/api";
import { LIMITS, RATE_LIMITS } from "@/shared/constants";
import { TraceSchema, type Trace } from "@/shared/trace";
import type { ExecutionProvider } from "@/server/execution";
import { AppError, describeError } from "@/server/security/errors";
import type { RateLimiter } from "@/server/security/rate-limit";
import type { Identity } from "./identity";

export interface RunServiceDeps {
  provider: ExecutionProvider;
  rateLimiter: RateLimiter;
  recordUsage?: (event: { language: string; status: string; durationMs: number; reason?: string }) => Promise<void>;
  clock?: () => number;
  maxConcurrentRuns?: number;
  rateLimitMultiplier?: number;
}

/** Orchestrates a run: static checks, rate limit, isolated execution, and trace validation. */
export function createRunService(deps: RunServiceDeps) {
  const clock = deps.clock ?? Date.now;
  const maxConcurrent = deps.maxConcurrentRuns ?? 8;
  const multiplier = deps.rateLimitMultiplier ?? 1;
  let inFlight = 0;

  return {
    async run(request: RunRequest, identity: Identity): Promise<Trace> {
      const adapter = getLanguageAdapter(request.language);
      const issues = adapter.findUnsupportedFeatures(request.code);
      const firstIssue = issues[0];
      if (firstIssue) {
        throw new AppError("UNSUPPORTED_FEATURE", `Line ${firstIssue.line}: ${firstIssue.message}`);
      }

      const signedIn = identity.kind === "user";
      await deps.rateLimiter.check(
        {
          name: "runs",
          limit: (signedIn ? RATE_LIMITS.runsPerMinuteSignedIn : RATE_LIMITS.runsPerMinuteAnonymous) * multiplier,
          windowMs: 60_000,
        },
        identity.key,
      );

      if (inFlight >= maxConcurrent) {
        throw new AppError("RATE_LIMITED", "The visualizer is busy right now. Try again in a few seconds.", {
          retryAfterSeconds: 5,
        });
      }
      inFlight++;
      const started = clock();
      try {
        const plan = adapter.buildRunPlan({
          code: request.code,
          stdin: request.stdin,
          toolsDir: deps.provider.toolsDir,
          maxSteps: LIMITS.maxSteps,
          timeoutMs: LIMITS.executionTimeoutMs,
        });
        const result = await withTimeout(
          deps.provider.run(plan, { timeoutMs: LIMITS.executionTimeoutMs, maxOutputBytes: LIMITS.maxTraceBytes }),
          LIMITS.requestTimeoutMs,
        );
        const trace = parseTrace(result.stdout);
        await deps.recordUsage?.({ language: request.language, status: trace.status, durationMs: clock() - started }).catch(() => undefined);
        return trace;
      } catch (err) {
        // Infrastructure failures: keep the real cause server-side so they can be diagnosed.
        const code = err instanceof AppError ? err.code : "INTERNAL";
        const reason = describeError(err);
        console.error(`Run failed (${code}): ${reason}`);
        await deps.recordUsage?.({ language: request.language, status: `failed:${code}`, durationMs: clock() - started, reason }).catch(() => undefined);
        throw err;
      } finally {
        inFlight--;
      }
    },
  };
}

function parseTrace(stdout: string): Trace {
  if (stdout.length >= LIMITS.maxTraceBytes) {
    throw new AppError("EXECUTION_FAILED", "The program produced too much trace data to visualize.");
  }
  let json: unknown;
  try {
    json = JSON.parse(stdout);
  } catch (cause) {
    throw new AppError("EXECUTION_FAILED", "The visualizer could not read the program's trace.", { cause });
  }
  const parsed = TraceSchema.safeParse(json);
  if (!parsed.success) {
    throw new AppError("EXECUTION_FAILED", "The visualizer received an invalid trace.", { cause: parsed.error });
  }
  if (parsed.data.status === "internal_error") {
    throw new AppError("EXECUTION_FAILED", "The visualizer hit an internal problem running this program.", {
      cause: parsed.data.message,
    });
  }
  return parsed.data;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AppError("EXECUTION_FAILED", "Running the code took too long.")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
