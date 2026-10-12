import factorial from "@tests/fixtures/traces/factorial.json";
import type { ExecutionProvider } from "@/server/execution";
import { AppError } from "@/server/security/errors";
import { MemoryRateLimitStore, RateLimiter } from "@/server/security/rate-limit";
import { anonymousIdentity, userIdentity } from "./identity";
import { createRunService } from "./run.service";

function provider(stdout: string, onRun?: () => void): ExecutionProvider {
  return {
    name: "fake",
    toolsDir: "/tools",
    run: async () => {
      onRun?.();
      return { stdout, stderr: "", exitCode: 0 };
    },
  };
}

const request = { language: "java" as const, code: "public class Main { public static void main(String[] a) {} }", stdin: "" };

describe("run service", () => {
  it("returns a validated trace and records usage", async () => {
    const recordUsage = vi.fn(async () => undefined);
    const service = createRunService({
      provider: provider(JSON.stringify(factorial)),
      rateLimiter: new RateLimiter(new MemoryRateLimitStore()),
      recordUsage,
    });
    const trace = await service.run(request, anonymousIdentity("abc"));
    expect(trace.status).toBe("ok");
    expect(recordUsage).toHaveBeenCalledWith(expect.objectContaining({ language: "java", status: "ok" }));
  });

  it("rejects unsupported features before running anything", async () => {
    const onRun = vi.fn();
    const service = createRunService({ provider: provider("{}", onRun), rateLimiter: new RateLimiter(new MemoryRateLimitStore()) });
    const err = await service.run({ ...request, code: "class A {\n Thread t; }" }, anonymousIdentity("x")).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe("UNSUPPORTED_FEATURE");
    expect((err as AppError).message).toContain("Line 2");
    expect(onRun).not.toHaveBeenCalled();
  });

  it("rate limits anonymous users more strictly than signed-in users", async () => {
    const limiter = new RateLimiter(new MemoryRateLimitStore(), () => 0);
    const service = createRunService({ provider: provider(JSON.stringify(factorial)), rateLimiter: limiter });
    for (let i = 0; i < 10; i++) await service.run(request, anonymousIdentity("same"));
    await expect(service.run(request, anonymousIdentity("same"))).rejects.toMatchObject({ code: "RATE_LIMITED" });
    for (let i = 0; i < 11; i++) await service.run(request, userIdentity("u1"));
  });

  it("turns garbage output into a safe execution error", async () => {
    const service = createRunService({ provider: provider("not json"), rateLimiter: new RateLimiter(new MemoryRateLimitStore()) });
    await expect(service.run(request, anonymousIdentity("z"))).rejects.toMatchObject({ code: "EXECUTION_FAILED" });
  });

  it("rejects traces that fail schema validation or report internal errors", async () => {
    const limiter = new RateLimiter(new MemoryRateLimitStore());
    const bad = createRunService({ provider: provider(JSON.stringify({ version: 1 })), rateLimiter: limiter });
    await expect(bad.run(request, anonymousIdentity("q"))).rejects.toMatchObject({ code: "EXECUTION_FAILED" });
    const internal = createRunService({
      provider: provider(JSON.stringify({ version: 1, language: "java", status: "internal_error", steps: [], stdout: "" })),
      rateLimiter: limiter,
    });
    await expect(internal.run(request, anonymousIdentity("q"))).rejects.toMatchObject({ code: "EXECUTION_FAILED" });
  });

  it("limits concurrent runs per instance", async () => {
    let release: () => void = () => undefined;
    const slow: ExecutionProvider = {
      name: "slow",
      toolsDir: "/t",
      run: () => new Promise((resolve) => (release = () => resolve({ stdout: JSON.stringify(factorial), stderr: "", exitCode: 0 }))),
    };
    const service = createRunService({ provider: slow, rateLimiter: new RateLimiter(new MemoryRateLimitStore()), maxConcurrentRuns: 1 });
    const first = service.run(request, userIdentity("a"));
    await new Promise((r) => setTimeout(r, 0));
    await expect(service.run(request, userIdentity("b"))).rejects.toMatchObject({ code: "RATE_LIMITED" });
    release();
    await expect(first).resolves.toMatchObject({ status: "ok" });
  });
});
