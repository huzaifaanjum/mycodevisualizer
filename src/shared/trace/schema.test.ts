import factorial from "@tests/fixtures/traces/factorial.json";
import arraySum from "@tests/fixtures/traces/array-sum.json";
import outOfBounds from "@tests/fixtures/traces/out-of-bounds.json";
import compileError from "@tests/fixtures/traces/compile-error.json";
import { TraceSchema } from "./schema";

describe("TraceSchema", () => {
  it.each([
    ["factorial", factorial],
    ["array-sum", arraySum],
    ["out-of-bounds", outOfBounds],
    ["compile-error", compileError],
  ])("accepts real tracer output (%s)", (_name, fixture) => {
    expect(TraceSchema.safeParse(fixture).success).toBe(true);
  });

  it("rejects an unknown schema version", () => {
    expect(TraceSchema.safeParse({ ...factorial, version: 2 }).success).toBe(false);
  });

  it("rejects malformed values", () => {
    const broken = structuredClone(factorial) as { steps: { frames: { locals: { value: unknown }[] }[] }[] };
    const local = broken.steps[0]?.frames[0]?.locals[0];
    if (local) local.value = { kind: "pointer" };
    expect(TraceSchema.safeParse(broken).success).toBe(false);
  });
});
