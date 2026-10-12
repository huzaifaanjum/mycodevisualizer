import "server-only";
import { getConfig } from "@/server/env";
import { createFixtureProvider } from "./fixture.provider";
import { createLocalProcessProvider } from "./local-process.provider";
import type { ExecutionProvider } from "./types";
import { createVercelSandboxProvider } from "./vercel-sandbox.provider";

let provider: ExecutionProvider | undefined;

export function getExecutionProvider(): ExecutionProvider {
  if (provider) return provider;
  const { env, executionProvider } = getConfig();
  switch (executionProvider) {
    case "vercel-sandbox":
      provider = createVercelSandboxProvider(env.VERCEL_SANDBOX_SNAPSHOT_ID);
      break;
    case "local":
      provider = createLocalProcessProvider(env.TRACER_JAR_PATH, env.NODE_ENV);
      break;
    case "fixture":
      provider = createFixtureProvider();
      break;
    default: {
      const exhaustive: never = executionProvider;
      throw new Error(`Unknown execution provider: ${String(exhaustive)}`);
    }
  }
  return provider;
}

export type { ExecutionProvider, ExecutionResult } from "./types";
