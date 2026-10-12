import arraySum from "@tests/fixtures/traces/array-sum.json";
import factorial from "@tests/fixtures/traces/factorial.json";
import { TraceSchema } from "@/shared/trace";
import {
  buildCallTree,
  changedHeapSlots,
  changedLocals,
  currentFrame,
  drawableHeap,
  formatValue,
  isDrawnOnHeap,
  stdinSlice,
  stdinTokens,
  stdoutAt,
} from "./trace-helpers";

const fact = TraceSchema.parse(factorial);
const sum = TraceSchema.parse(arraySum);

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

  it("builds a recursion tree with return values", () => {
    const tree = buildCallTree(fact, fact.steps.length - 2);
    const main = tree.nodes.get(tree.roots[0] ?? "");
    expect(main?.method).toBe("main");
    const first = tree.nodes.get(main?.children[0] ?? "");
    expect(first).toMatchObject({ method: "factorial", args: "n = 4", returnValue: "24", status: "returned" });
    expect(tree.nodes.size).toBe(5);
  });

  it("marks the current call while recursing", () => {
    const deepest = fact.steps.findIndex((s) => s.frames.length === 5);
    const tree = buildCallTree(fact, deepest);
    const statuses = [...tree.nodes.values()].map((n) => n.status);
    expect(statuses.filter((s) => s === "current")).toHaveLength(1);
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
