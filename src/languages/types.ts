import type { LanguageId } from "@/shared/constants";

export interface SourceIssue {
  line: number;
  message: string;
}

export interface RunFile {
  /** Path relative to the run's working directory. */
  path: string;
  content: string;
}

export interface RunPlan {
  files: RunFile[];
  command: string;
  args: string[];
}

/**
 * Everything the platform needs to support a language. Adding a language means adding a folder
 * that implements this interface and registering it; the UI only ever sees the shared Trace type.
 */
export interface LanguageAdapter {
  id: LanguageId;
  displayName: string;
  monacoLanguage: string;
  starterCode: string;
  starterStdin: string;
  /** Fast, static checks that reject programs we know we cannot (or must not) run. */
  findUnsupportedFeatures(code: string): SourceIssue[];
  /** Builds the files and command that run the tracer inside an execution environment. */
  buildRunPlan(input: { code: string; stdin: string; toolsDir: string; maxSteps: number; timeoutMs: number }): RunPlan;
  /** Beginner-friendly explanation of a runtime exception. */
  explainException(type: string, message: string): string;
  /** Beginner-friendly rewording of a compiler message. */
  explainDiagnostic(message: string): string;
}
