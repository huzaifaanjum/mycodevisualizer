import "server-only";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { AppError } from "@/server/security/errors";
import type { ExecutionProvider, ExecutionResult } from "./types";

/**
 * DEVELOPMENT ONLY. Runs the tracer as a local process. There is no isolation, so the factory
 * refuses to create it in production.
 */
export function createLocalProcessProvider(tracerJarPath: string, nodeEnv: string): ExecutionProvider {
  if (nodeEnv === "production") {
    throw new Error("The local execution provider must never be used in production.");
  }
  const jar = resolve(tracerJarPath);
  return {
    name: "local",
    toolsDir: dirname(jar),
    async run(plan, { timeoutMs, maxOutputBytes }): Promise<ExecutionResult> {
      const dir = await mkdtemp(join(tmpdir(), "mcv-run-"));
      try {
        await Promise.all(plan.files.map((f) => writeFile(join(dir, f.path), f.content, "utf8")));
        return await new Promise<ExecutionResult>((resolvePromise, reject) => {
          const child = spawn(plan.command, plan.args, {
            cwd: dir,
            env: { NODE_ENV: process.env.NODE_ENV, PATH: process.env.PATH ?? "", HOME: dir, JAVA_TOOL_OPTIONS: "" },
            stdio: ["ignore", "pipe", "pipe"] as const,
          });
          let stdout = "";
          let stderr = "";
          child.stdout.on("data", (d: Buffer) => {
            if (stdout.length < maxOutputBytes) stdout += d.toString("utf8");
          });
          child.stderr.on("data", (d: Buffer) => {
            if (stderr.length < 4096) stderr += d.toString("utf8");
          });
          const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs + 10_000);
          child.on("error", (err) => {
            clearTimeout(timer);
            reject(new AppError("EXECUTION_FAILED", "Java is not available. Install JDK 21 and run yarn tracer:build.", { cause: err }));
          });
          child.on("close", (code) => {
            clearTimeout(timer);
            resolvePromise({ stdout, stderr, exitCode: code });
          });
        });
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  };
}
