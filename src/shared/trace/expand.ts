import type { Trace } from "./schema";

/**
 * Turns a delta-encoded trace into one where every step has its full heap. Objects are shared
 * between steps (not copied), so memory stays proportional to what actually changed.
 * Objects that went out of reach stay in later heaps, which is harmless: views only render what is
 * reachable from the stack.
 */
export function expandTrace(trace: Trace): Trace {
  if (trace.heapEncoding !== "delta") return trace;
  let heap: Trace["steps"][number]["heap"] = {};
  const steps = trace.steps.map((step) => {
    heap = Object.keys(step.heap).length === 0 ? heap : { ...heap, ...step.heap };
    return { ...step, heap };
  });
  return { ...trace, heapEncoding: "full", steps };
}
