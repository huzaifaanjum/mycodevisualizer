import type { RunPlan } from "@/languages";

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/**
 * Runs a language tracer somewhere isolated. Implementations decide WHERE code runs;
 * language adapters decide WHAT runs. User code must never run on the web server itself
 * in production.
 */
export interface ExecutionProvider {
  readonly name: string;
  /** Directory containing the tracer tools inside the execution environment. */
  readonly toolsDir: string;
  run(plan: RunPlan, options: { timeoutMs: number; maxOutputBytes: number }): Promise<ExecutionResult>;
}
