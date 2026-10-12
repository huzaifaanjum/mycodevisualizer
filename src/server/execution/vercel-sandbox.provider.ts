import "server-only";
import { Sandbox } from "@vercel/sandbox";
import { after } from "next/server";
import { AppError, describeError } from "@/server/security/errors";
import {
  buildRuntimeSnapshot,
  hashSources,
  readTracerSources,
  SANDBOX_TOOLS_DIR,
  type RuntimeRecordStore,
} from "./runtime-snapshot";
import type { ExecutionProvider, ExecutionResult } from "./types";

export { SANDBOX_TOOLS_DIR };

interface Options {
  /** Snapshot configured by environment variable; used until a newer one is recorded. */
  configuredSnapshotId: string | undefined;
  /** Shared record of the current runtime (MongoDB); absent when the database isn't configured. */
  store: RuntimeRecordStore | null;
}

const SETUP_MESSAGE = "The Java runtime is being set up. Please try again in about a minute.";

/**
 * Runs each request in a fresh Firecracker microVM restored from a snapshot that contains a JDK and
 * tracer.jar: no network, one vCPU, short lifetime, destroyed after the run.
 *
 * Self-healing: if the snapshot is missing or expired, or was built from older tracer sources, a new
 * one is built in the background (after the response) and recorded for every instance.
 */
export function createVercelSandboxProvider({ configuredSnapshotId, store }: Options): ExecutionProvider {
  let rebuild: Promise<void> | null = null;
  let localRecord: string | null = null;
  // Hash of the tracer sources in this deployment; computed once per instance.
  const deployedTracerHash = readTracerSources()
    .then(hashSources)
    .catch(() => "");

  function scheduleRebuild(reason: string): void {
    if (rebuild) return;
    console.warn(`Rebuilding Java runtime snapshot: ${reason}`);
    rebuild = buildRuntimeSnapshot()
      .then(async (record) => {
        localRecord = record.snapshotId;
        await store?.set(record);
        console.warn(`Java runtime snapshot ready: ${record.snapshotId}`);
      })
      .catch((err: unknown) => console.error("Java runtime rebuild failed", err))
      .finally(() => {
        rebuild = null;
      });
    after(() => rebuild ?? undefined);
  }

  async function currentSnapshotId(): Promise<string | null> {
    const record = await store?.get().catch(() => null);
    if (record) {
      const sourcesHash = await deployedTracerHash;
      if (sourcesHash && record.tracerHash !== sourcesHash) scheduleRebuild("tracer sources changed");
      return record.snapshotId;
    }
    return localRecord ?? configuredSnapshotId ?? null;
  }

  return {
    name: "vercel-sandbox",
    toolsDir: SANDBOX_TOOLS_DIR,
    async run(plan, { timeoutMs, maxOutputBytes }): Promise<ExecutionResult> {
      const snapshotId = await currentSnapshotId();
      if (!snapshotId) {
        scheduleRebuild("no snapshot configured");
        throw new AppError("SERVICE_UNAVAILABLE", SETUP_MESSAGE, { retryAfterSeconds: 60 });
      }
      let sandbox: Sandbox | undefined;
      try {
        try {
          sandbox = await createSandbox(snapshotId, timeoutMs);
        } catch (err) {
          if (isMissingSnapshot(err)) {
            scheduleRebuild(`snapshot ${snapshotId} is unavailable`);
            throw new AppError("SERVICE_UNAVAILABLE", SETUP_MESSAGE, { retryAfterSeconds: 60, cause: err });
          }
          throw err;
        }
        await sandbox.writeFiles(plan.files.map((f) => ({ path: f.path, content: Buffer.from(f.content, "utf8") })));
        const result = await sandbox.runCommand(plan.command, plan.args, { timeoutMs: timeoutMs + 10_000 });
        const [stdout, stderr] = await Promise.all([result.stdout(), result.stderr()]);
        return { stdout: stdout.slice(0, maxOutputBytes), stderr: stderr.slice(0, 4096), exitCode: result.exitCode };
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError("EXECUTION_FAILED", "We couldn't start a sandbox to run your code. Please try again.", { cause: err });
      } finally {
        await sandbox?.stop().catch(() => undefined);
      }
    },
  };
}

const CREATE_ATTEMPTS = 2;
const RETRY_DELAY_MS = 750;

/**
 * One throwaway microVM per run. `persistent: false` matters: persistent sandboxes save a ~1 GB
 * filesystem snapshot every time they stop, which slows every run down and fills snapshot storage.
 * Creation is retried once because the Sandbox API occasionally rejects a request transiently.
 */
async function createSandbox(snapshotId: string, timeoutMs: number): Promise<Sandbox> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= CREATE_ATTEMPTS; attempt++) {
    try {
      return await Sandbox.create({
        source: { type: "snapshot", snapshotId },
        resources: { vcpus: 1 },
        timeout: timeoutMs + 20_000,
        networkPolicy: "deny-all",
        persistent: false,
      });
    } catch (err) {
      lastError = err;
      if (isMissingSnapshot(err) || attempt === CREATE_ATTEMPTS) break;
      console.warn(`Sandbox create failed, retrying: ${describeError(err)}`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  throw lastError;
}

function isMissingSnapshot(err: unknown): boolean {
  const text = err instanceof Error ? `${err.message} ${JSON.stringify((err as { json?: unknown }).json ?? "")}` : String(err);
  return /snapshot/i.test(text) && /(not.?found|expired|does not exist|404|410)/i.test(text);
}
