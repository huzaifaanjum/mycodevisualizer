import arraySum from "@tests/fixtures/traces/array-sum.json";
import factorial from "@tests/fixtures/traces/factorial.json";
import { expandTrace, TraceSchema } from "@/shared/trace";
import {
  changedHeapSlots,
  changedLocals,
  currentFrame,
  drawableHeap,
  formatValue,
  heapObjectLabels,
  isDrawnOnHeap,
  stdinSlice,
  stdinTokens,
  stdoutAt,
} from "./trace-helpers";

const fact = expandTrace(TraceSchema.parse(factorial));
const sum = expandTrace(TraceSchema.parse(arraySum));

describe("trace helpers", () => {
  it("formats primitives, nulls, strings and arrays", () => {
    const heap = { a: { kind: "string" as const, value: "hi" }, b: { kind: "array" as const, elementType: "int", length: 3, items: [] } };
    expect(formatValue({ kind: "primitive", type: "int", display: "3" }, heap)).toBe("3");
    expect(formatValue({ kind: "null" }, heap)).toBe("null");
    expect(formatValue({ kind: "ref", heapId: "a" }, heap)).toBe('"hi"');
    expect(formatValue({ kind: "ref", heapId: "b" }, heap)).toBe("int[3]");
    expect(formatValue({ kind: "ref", heapId: "missing" }, heap)).toBe("…");
    expect(isDrawnOnHeap({ kind: "ref", heapId: "a" }, heap)).toBe(false);
    expect(isDrawnOnHeap({ kind: "ref", heapId: "b" }, heap)).toBe(true);
  });

  it("slices stdout up to the step", () => {
    const last = sum.steps.at(-1);
    expect(stdoutAt(sum, last)).toBe("Sum: 8\n");
    expect(stdoutAt(sum, sum.steps[0])).toBe("");
  });

  it("returns the current frame", () => {
    expect(currentFrame(fact.steps[4])?.method).toBe("factorial");
    expect(currentFrame(undefined)).toBeUndefined();
  });

  it("marks stdin tokens as consumed, next and pending", () => {
    expect(stdinTokens("3 4\n5", 2)).toEqual([
      { text: "3", state: "consumed" },
      { text: "4", state: "next" },
      { text: "5", state: "pending" },
    ]);
    expect(stdinSlice("12 34", 0, 3)).toBe("12");
  });

  it("draws arrays once, hides the empty args array, and follows aliases", () => {
    const step = sum.steps.find((s) => s.frames[0]?.locals.some((l) => l.name === "alias"));
    const drawn = drawableHeap(step);
    expect(drawn).toHaveLength(1);
    expect(drawn[0]?.[1].kind).toBe("array");
    expect(drawableHeap(undefined)).toEqual([]);
  });

  it("detects changed locals and heap slots", () => {
    const i = sum.steps.findIndex((s, idx) => idx > 0 && s.frames[0]?.locals.find((l) => l.name === "sum")?.value.kind === "primitive" && (s.frames[0]?.locals.find((l) => l.name === "sum")?.value as { display: string }).display === "3");
    const changed = changedLocals(sum.steps[i - 1], sum.steps[i]);
    expect([...changed].some((k) => k.endsWith(":sum"))).toBe(true);
    const write = sum.steps.findIndex((s, idx) => idx > 0 && changedHeapSlots(sum.steps[idx - 1], s).size > 0);
    expect(write).toBeGreaterThan(0);
    expect(changedLocals(undefined, undefined).size).toBe(0);
  });
});

describe("heapObjectLabels", () => {
  it("names every variable that refers to an object, so aliases are visible", () => {
    const step = sum.steps.find((s) => s.frames[0]?.locals.some((l) => l.name === "alias"));
    if (!step) throw new Error("fixture changed");
    const labels = [...heapObjectLabels(step).values()];
    expect(labels).toContainEqual(["nums", "alias"]);
  });

  it("qualifies variables of callers with their method name", () => {
    const inCall = fact.steps.find((s) => s.frames.length === 2);
    if (!inCall) throw new Error("fixture changed");
    expect([...heapObjectLabels(inCall).values()].flat()).toContain("main: sc");
  });
});
