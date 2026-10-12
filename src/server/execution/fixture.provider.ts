import "server-only";
import arraySum from "@tests/fixtures/traces/array-sum.json";
import compileError from "@tests/fixtures/traces/compile-error.json";
import factorial from "@tests/fixtures/traces/factorial.json";
import outOfBounds from "@tests/fixtures/traces/out-of-bounds.json";
import type { ExecutionProvider } from "./types";

/**
 * Returns recorded traces instead of running anything. Used by end-to-end tests and UI work
 * without a JDK. It never executes user code, so it is safe in any environment.
 */
export function createFixtureProvider(): ExecutionProvider {
  return {
    name: "fixture",
    toolsDir: "/fixtures",
    async run(plan) {
      const code = plan.files.find((f) => f.path.endsWith(".java"))?.content ?? "";
      const trace = code.includes("class ArraySum")
        ? arraySum
        : code.includes("class OutOfBounds")
          ? outOfBounds
          : code.includes("class Broken")
            ? compileError
            : factorial;
      return { stdout: JSON.stringify(trace), stderr: "", exitCode: 0 };
    },
  };
}
