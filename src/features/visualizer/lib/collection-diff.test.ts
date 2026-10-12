import collections from "@tests/fixtures/traces/collections.json";
import { expandTrace, TraceSchema, type Heap, type Value } from "@/shared/trace";
import { diffCollection, diffSequence } from "./collection-diff";
import { describeStep } from "./step-notes";

const p = (display: string): Value => ({ kind: "primitive", type: "int", display });
const seq = (before: string[], after: string[], truncated = { before: false, after: false }) =>
  diffSequence(before.map(p), {}, after.map(p), {}, {
    pairReplacements: true,
    beforeTruncated: truncated.before,
    afterTruncated: truncated.after,
  });

describe("diffSequence", () => {
  it("marks an insertion in the middle as one added item", () => {
    const d = seq(["1", "2", "3"], ["1", "9", "2", "3"]);
    expect(d.items.map((i) => i.status)).toEqual(["same", "added", "same", "same"]);
    expect(d.removed).toEqual([]);
  });

  it("reports removals with their old index", () => {
    const d = seq(["1", "2", "3"], ["1", "3"]);
    expect(d.removed.map((r) => [r.index, r.display])).toEqual([[1, "2"]]);
    expect(d.items.every((i) => i.status === "same")).toBe(true);
  });

  it("pairs a removal and an insertion at the same spot as a replacement", () => {
    const d = seq(["1", "2", "3"], ["1", "7", "3"]);
    expect(d.items[1]).toEqual({ status: "changed", from: "2" });
    expect(d.removed).toEqual([]);
  });

  it("ignores items that only slid in or out of a truncated view", () => {
    const d = seq(["1", "2", "3"], ["0", "1", "2"], { before: true, after: true });
    expect(d.items.map((i) => i.status)).toEqual(["added", "same", "same"]);
    expect(d.removed).toEqual([]);
  });

  it("handles empty sequences", () => {
    expect(seq([], ["1"]).items).toEqual([{ status: "added" }]);
    expect(seq(["1"], []).removed).toHaveLength(1);
  });

  it("compares Strings by content and other objects by identity", () => {
    const heapA: Heap = { s1: { kind: "string", value: "x" }, o1: { kind: "object", className: "P", fields: [] } };
    const heapB: Heap = { s2: { kind: "string", value: "x" }, o2: { kind: "object", className: "P", fields: [] } };
    const before: Value[] = [{ kind: "ref", heapId: "s1" }, { kind: "ref", heapId: "o1" }];
    const after: Value[] = [{ kind: "ref", heapId: "s2" }, { kind: "ref", heapId: "o2" }];
    const d = diffSequence(before, heapA, after, heapB, { pairReplacements: false, beforeTruncated: false, afterTruncated: false });
    expect(d.items.map((i) => i.status)).toEqual(["same", "added"]);
    expect(d.removed.map((r) => r.display)).toEqual(["P"]);
  });
});

describe("collections trace", () => {
  const trace = expandTrace(TraceSchema.parse(collections));
  const lines = "x\n".repeat(80).split("\n");
  const notes = trace.steps.flatMap((_, index) =>
    describeStep({ trace, index, sourceLines: lines, stdin: "", explainException: () => "" }).map((n) => n.text),
  );

  it("explains list additions, insertions, replacements and removals", () => {
    expect(notes).toContain('"Ada" was added to names at index 0. names now has 1 element.');
    expect(notes).toContain('"Grace" was added to names at index 1. names now has 3 elements.');
    expect(notes).toContain('names[0] was replaced: "Ada" → "Alan".');
    expect(notes).toContain('"Linus" was removed from names (it was at index 2). names now has 2 elements.');
  });

  it("explains map puts, updates and removals", () => {
    expect(notes).toContain('counts got a new entry "a" → 1. It now has 1 entry.');
    expect(notes).toContain('counts: the value for "a" changed from 1 to 2.');
    expect(notes).toContain('The entry for "b" was removed from counts. It now has 1 entry.');
  });

  it("explains set additions once (duplicates add nothing)", () => {
    expect(notes.filter((n) => n === "5 was added to the set seen. It now has 1 element.")).toHaveLength(1);
    expect(notes).toContain("9 was added to the set seen. It now has 2 elements.");
  });

  it("explains stack and queue operations", () => {
    expect(notes).toContain("2 was added to stack at index 0. stack now has 2 elements.");
    expect(notes).toContain("2 was removed from stack (it was at index 0). stack now has 1 element.");
    expect(notes).toContain('"x" was removed from queue (it was at index 0). queue now has 1 element.');
  });

  it("describes new collection variables instead of printing sizes", () => {
    expect(notes).toContain("names was created and refers to an empty ArrayList.");
    expect(notes.some((n) => n.startsWith("names changed from"))).toBe(false);
  });

  it("returns null for collections that did not change or did not exist", () => {
    const first = trace.steps[0];
    expect(diffCollection("missing", first, trace.steps[1])).toBeNull();
    expect(diffCollection("missing", undefined, first)).toBeNull();
  });
});
