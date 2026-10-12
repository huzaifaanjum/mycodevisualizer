import type { Trace } from "@/shared/trace";
import { formatValue } from "./trace-helpers";

/** One method call (activation) over the whole run. */
export interface CallRecord {
  id: string;
  /** 1-based call number in the order calls started. */
  order: number;
  method: string;
  className: string;
  /** Arguments as they were when the call started, e.g. "n = 3". */
  args: { name: string; value: string }[];
  parentId: string | null;
  children: string[];
  depth: number;
  /** Step where the call started, and where it finished (null if it never finished). */
  startStep: number;
  endStep: number | null;
  /** Formatted return value, if the method returned one. */
  returnValue: string | null;
  /** Exception type if this call is where the program crashed. */
  threw: string | null;
}

export type CallStatus = "future" | "current" | "active" | "returned" | "threw";

export interface CallTimeline {
  calls: Map<string, CallRecord>;
  roots: string[];
  maxDepth: number;
}

/** Every call in the run with its arguments, result and step range (computed once per trace). */
export function buildCallTimeline(trace: Trace): CallTimeline {
  const calls = new Map<string, CallRecord>();
  const roots: string[] = [];
  let maxDepth = 0;
  let previousIds: string[] = [];

  trace.steps.forEach((step, k) => {
    const ids = step.frames.map((f) => f.id);
    const current = new Set(ids);

    // Calls that finished between the previous step and this one; the innermost gets the return value.
    const finished = previousIds.filter((id) => !current.has(id));
    finished.forEach((id, i) => {
      const record = calls.get(id);
      if (!record) return;
      record.endStep = k;
      if (i === finished.length - 1 && step.returned && step.event !== "end") {
        record.returnValue = formatValue(step.returned.value, step.heap);
      }
    });

    step.frames.forEach((frame, depth) => {
      if (calls.has(frame.id)) return;
      const parentId = depth > 0 ? (step.frames[depth - 1]?.id ?? null) : null;
      const record: CallRecord = {
        id: frame.id,
        order: calls.size + 1,
        method: frame.method,
        className: frame.className,
        args: frame.locals
          .filter((l) => l.name !== "this" && !(frame.method === "main" && l.name === "args"))
          .map((l) => ({ name: l.name, value: formatValue(l.value, step.heap) })),
        parentId,
        children: [],
        depth,
        startStep: k,
        endStep: null,
        returnValue: null,
        threw: null,
      };
      calls.set(frame.id, record);
      maxDepth = Math.max(maxDepth, depth);
      if (parentId) calls.get(parentId)?.children.push(frame.id);
      else roots.push(frame.id);
    });

    if (step.event === "exception" && step.exception) {
      const top = step.frames.at(-1);
      const record = top && calls.get(top.id);
      if (record) record.threw = step.exception.type;
    }
    previousIds = ids;
  });

  return { calls, roots, maxDepth };
}

/** Where a call stands at step `index`. */
export function callStatus(record: CallRecord, index: number, currentId: string | null): CallStatus {
  if (record.startStep > index) return "future";
  if (record.threw && record.endStep === null) return record.id === currentId ? "threw" : "active";
  if (record.endStep !== null && record.endStep <= index) return "returned";
  return record.id === currentId ? "current" : "active";
}

/** Ids from the root call down to the call running at `index` (the call stack). */
export function activeChain(trace: Trace, index: number): string[] {
  const step = trace.steps[index];
  if (!step || step.event === "end") return [];
  return step.frames.map((f) => f.id);
}
