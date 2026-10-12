import { TraceSchema } from "./schema";
import { expandTrace } from "./expand";

const base = { version: 1, language: "java", status: "ok", stdout: "" } as const;
const step = (index: number, heap: Record<string, unknown>) => ({
  index,
  line: index + 1,
  event: "step",
  frames: [],
  heap,
  stdoutLength: 0,
  stdinConsumed: 0,
});

describe("expandTrace", () => {
  it("accumulates heap deltas into full heaps", () => {
    const trace = TraceSchema.parse({
      ...base,
      heapEncoding: "delta",
      steps: [
        step(0, { h1: { kind: "string", value: "a" } }),
        step(1, { h2: { kind: "list", className: "ArrayList", size: 0, items: [] } }),
        step(2, { h2: { kind: "list", className: "ArrayList", size: 1, items: [{ kind: "primitive", type: "int", display: "1" }] } }),
        step(3, {}),
      ],
    });
    const full = expandTrace(trace);
    expect(full.heapEncoding).toBe("full");
    expect(Object.keys(full.steps[0]?.heap ?? {})).toEqual(["h1"]);
    expect(Object.keys(full.steps[1]?.heap ?? {})).toEqual(["h1", "h2"]);
    expect(full.steps[2]?.heap.h2).toMatchObject({ size: 1 });
    expect(full.steps[1]?.heap.h2).toMatchObject({ size: 0 });
    expect(full.steps[3]?.heap).toBe(full.steps[2]?.heap);
  });

  it("returns full traces unchanged and defaults the encoding to full", () => {
    const trace = TraceSchema.parse({ ...base, steps: [step(0, {})] });
    expect(trace.heapEncoding).toBe("full");
    expect(expandTrace(trace)).toBe(trace);
  });
});
