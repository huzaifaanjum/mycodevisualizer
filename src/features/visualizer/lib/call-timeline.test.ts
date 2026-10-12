import factorial from "@tests/fixtures/traces/factorial.json";
import outOfBounds from "@tests/fixtures/traces/out-of-bounds.json";
import { expandTrace, TraceSchema } from "@/shared/trace";
import { activeChain, buildCallTimeline, callStatus } from "./call-timeline";

const fact = expandTrace(TraceSchema.parse(factorial));
const oob = expandTrace(TraceSchema.parse(outOfBounds));

describe("buildCallTimeline", () => {
  const timeline = buildCallTimeline(fact);
  const calls = [...timeline.calls.values()];

  it("numbers every call in start order with its arguments", () => {
    expect(calls.map((c) => `${c.order}:${c.method}(${c.args.map((a) => `${a.name}=${a.value}`).join(",")})`)).toEqual([
      "1:main()",
      "2:factorial(n=4)",
      "3:factorial(n=3)",
      "4:factorial(n=2)",
      "5:factorial(n=1)",
    ]);
    expect(timeline.maxDepth).toBe(4);
    expect(timeline.roots).toHaveLength(1);
  });

  it("links parents and children and records return values", () => {
    const [main, f4, f3, , f1] = calls;
    expect(main?.children).toEqual([f4?.id]);
    expect(f3?.parentId).toBe(f4?.id);
    expect(f1?.returnValue).toBe("1");
    expect(f4?.returnValue).toBe("24");
  });

  it("records the step range of each call", () => {
    const f1 = calls[4];
    expect(f1?.startStep).toBeGreaterThan(0);
    expect(f1?.endStep).toBe((f1?.startStep ?? 0) + 2);
    expect(calls[0]?.endStep).toBe(fact.steps.length - 1);
  });

  it("derives each call's status at a given step", () => {
    const f1 = calls[4];
    if (!f1) throw new Error("fixture changed");
    expect(callStatus(f1, 0, null)).toBe("future");
    expect(callStatus(f1, f1.startStep, f1.id)).toBe("current");
    expect(callStatus(f1, f1.startStep, "other")).toBe("active");
    expect(callStatus(f1, fact.steps.length - 1, null)).toBe("returned");
  });

  it("marks the call where an exception happened", () => {
    const crashed = [...buildCallTimeline(oob).calls.values()][0];
    if (!crashed) throw new Error("fixture changed");
    expect(crashed.threw).toBe("ArrayIndexOutOfBoundsException");
    expect(callStatus(crashed, oob.steps.length - 1, crashed.id)).toBe("threw");
  });

  it("gives the active call chain at a step", () => {
    const deepest = fact.steps.findIndex((s) => s.frames.length === 5);
    expect(activeChain(fact, deepest)).toHaveLength(5);
    expect(activeChain(fact, fact.steps.length - 1)).toEqual([]);
  });
});
