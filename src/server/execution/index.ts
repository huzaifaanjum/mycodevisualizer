import "server-only";
import { getConfig } from "@/server/env";
import { createFixtureProvider } from "./fixture.provider";
import { createLocalProcessProvider } from "./local-process.provider";
import type { ExecutionProvider } from "./types";
import { mongoRuntimeStore } from "@/server/repositories/runtime.repository";
import { createVercelSandboxProvider } from "./vercel-sandbox.provider";

let provider: ExecutionProvider | undefined;

export function getExecutionProvider(): ExecutionProvider {
  if (provider) return provider;
  const { env, executionProvider, features } = getConfig();
  switch (executionProvider) {
    case "vercel-sandbox":
      provider = createVercelSandboxProvider({
        configuredSnapshotId: env.VERCEL_SANDBOX_SNAPSHOT_ID,
        store: features.database ? mongoRuntimeStore : null,
      });
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
