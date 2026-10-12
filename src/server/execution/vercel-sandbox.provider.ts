import "server-only";
import { Sandbox } from "@vercel/sandbox";
import { AppError } from "@/server/security/errors";
import type { ExecutionProvider, ExecutionResult } from "./types";

/** Where scripts/build-sandbox-snapshot.ts installs tracer.jar inside the snapshot. */
export const SANDBOX_TOOLS_DIR = "/opt/mcv";

/**
 * Runs each request in a fresh Firecracker microVM restored from a snapshot that contains a JDK and
 * tracer.jar. No network, one vCPU, short lifetime, destroyed after the run.
 */
export function createVercelSandboxProvider(snapshotId: string | undefined): ExecutionProvider {
  return {
    name: "vercel-sandbox",
    toolsDir: SANDBOX_TOOLS_DIR,
    async run(plan, { timeoutMs, maxOutputBytes }): Promise<ExecutionResult> {
      if (!snapshotId) {
        throw new AppError("SERVICE_UNAVAILABLE", "Code execution is not configured yet.");
      }
      let sandbox: Awaited<ReturnType<typeof Sandbox.create>> | undefined;
      try {
        sandbox = await Sandbox.create({
          source: { type: "snapshot", snapshotId },
          resources: { vcpus: 1 },
          timeout: timeoutMs + 20_000,
          networkPolicy: "deny-all",
        });
        await sandbox.writeFiles(plan.files.map((f) => ({ path: f.path, content: Buffer.from(f.content, "utf8") })));
        const result = await sandbox.runCommand(plan.command, plan.args, {
          timeoutMs: timeoutMs + 10_000,
        });
        const [stdout, stderr] = await Promise.all([result.stdout(), result.stderr()]);
        return {
          stdout: stdout.slice(0, maxOutputBytes),
          stderr: stderr.slice(0, 4096),
          exitCode: result.exitCode,
        };
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError("EXECUTION_FAILED", "We couldn't start a sandbox to run your code. Please try again.", {
          cause: err,
        });
      } finally {
        await sandbox?.stop().catch(() => undefined);
      }
    },
  };
}
