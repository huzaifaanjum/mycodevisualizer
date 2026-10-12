import "server-only";
import arraySum from "@tests/fixtures/traces/array-sum.json";
import collections from "@tests/fixtures/traces/collections.json";
import compileError from "@tests/fixtures/traces/compile-error.json";
import factorial from "@tests/fixtures/traces/factorial.json";
import outOfBounds from "@tests/fixtures/traces/out-of-bounds.json";
import type { ExecutionProvider } from "./types";

/** Recorded traces keyed by the class name that selects them; the starter program is the default. */
const FIXTURES: [marker: string, trace: unknown][] = [
  ["class Collections101", collections],
  ["class ArraySum", arraySum],
  ["class OutOfBounds", outOfBounds],
  ["class Broken", compileError],
];

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
      const trace = FIXTURES.find(([marker]) => code.includes(marker))?.[1] ?? factorial;
      return { stdout: JSON.stringify(trace), stderr: "", exitCode: 0 };
    },
  };
}
