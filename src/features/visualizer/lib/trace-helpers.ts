import type { Frame, Heap, HeapObject, Step, Trace, Value } from "@/shared/trace";

export function currentFrame(step: Step | undefined): Frame | undefined {
  return step?.frames.at(-1);
}

export function stdoutAt(trace: Trace, step: Step | undefined): string {
  return trace.stdout.slice(0, step?.stdoutLength ?? 0);
}

/** Display text for a value; Strings show inline with quotes because beginners read them as values. */
export function formatValue(value: Value, heap: Heap): string {
  switch (value.kind) {
    case "primitive":
      return value.display;
    case "null":
      return "null";
    case "ref": {
      const obj = heap[value.heapId];
      if (!obj) return "…";
      if (obj.kind === "string") return JSON.stringify(obj.value);
      if (obj.kind === "array") return `${obj.elementType}[${obj.length}]`;
      if (obj.kind === "list" || obj.kind === "set" || obj.kind === "map") return `${obj.className}(size ${obj.size})`;
      return obj.className;
    }
    default: {
      const exhaustive: never = value;
      return exhaustive;
    }
  }
}

/**
 * Identity used to compare collection elements between steps: primitives and Strings compare by
 * content (that's what students see), other objects by identity.
 */
export function valueKey(value: Value, heap: Heap): string {
  if (value.kind === "ref") {
    const obj = heap[value.heapId];
    return obj?.kind === "string" ? `s:${obj.value}` : `@${value.heapId}`;
  }
  return value.kind === "null" ? "null" : `p:${value.display}`;
}

/** True when the value should be drawn as a box with an arrow rather than inline text. */
export function isDrawnOnHeap(value: Value, heap: Heap): value is Extract<Value, { kind: "ref" }> {
  if (value.kind !== "ref") return false;
  const obj = heap[value.heapId];
  return obj !== undefined && obj.kind !== "string";
}

/** Heap objects worth drawing (arrays and objects reachable from frames), in first-seen order. */
export function drawableHeap(step: Step | undefined): [string, Exclude<HeapObject, { kind: "string" }>][] {
  if (!step) return [];
  const result: [string, Exclude<HeapObject, { kind: "string" }>][] = [];
  const seen = new Set<string>();
  const visit = (value: Value) => {
    if (value.kind !== "ref" || seen.has(value.heapId)) return;
    seen.add(value.heapId);
    const obj = step.heap[value.heapId];
    if (!obj || obj.kind === "string") return;
    // `String[] args` of main is always empty and only adds noise for beginners.
    if (obj.kind === "array" && obj.length === 0 && obj.elementType === "String") return;
    result.push([value.heapId, obj]);
    switch (obj.kind) {
      case "array":
      case "list":
      case "set":
        obj.items.forEach(visit);
        break;
      case "map":
        obj.entries.forEach((e) => {
          visit(e.key);
          visit(e.value);
        });
        break;
      case "object":
        obj.fields.forEach((f) => visit(f.value));
        break;
      default: {
        const exhaustive: never = obj;
        return exhaustive;
      }
    }
  };
  for (const frame of step.frames) frame.locals.forEach((l) => visit(l.value));
  return result;
}

export interface StdinToken {
  text: string;
  state: "consumed" | "next" | "pending";
}

/**
 * Splits stdin into whitespace-separated tokens and marks which ones the program has read.
 * `consumedBytes` comes from the tracer (bytes pulled from System.in so far).
 */
export function stdinTokens(stdin: string, consumedBytes: number): StdinToken[] {
  const encoder = new TextEncoder();
  const tokens: StdinToken[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  let nextAssigned = false;
  while ((match = regex.exec(stdin)) !== null) {
    const endByte = encoder.encode(stdin.slice(0, match.index + match[0].length)).length;
    if (endByte <= consumedBytes) {
      tokens.push({ text: match[0], state: "consumed" });
    } else if (!nextAssigned) {
      tokens.push({ text: match[0], state: "next" });
      nextAssigned = true;
    } else {
      tokens.push({ text: match[0], state: "pending" });
    }
  }
  return tokens;
}

/** Text read from stdin between two byte offsets, trimmed (what Scanner just returned). */
export function stdinSlice(stdin: string, fromBytes: number, toBytes: number): string {
  const bytes = new TextEncoder().encode(stdin);
  return new TextDecoder().decode(bytes.slice(fromBytes, toBytes)).trim();
}

export interface CallNode {
  id: string;
  method: string;
  args: string;
  parentId: string | null;
  depth: number;
  returnValue?: string;
  status: "active" | "current" | "returned";
  children: string[];
}

/** Builds the call tree for steps 0..index, used for the recursion view. */
export function buildCallTree(trace: Trace, index: number): { roots: string[]; nodes: Map<string, CallNode> } {
  const nodes = new Map<string, CallNode>();
  const roots: string[] = [];
  let previous: Frame[] = [];
  const upto = Math.min(index, trace.steps.length - 1);
  for (let i = 0; i <= upto; i++) {
    const step = trace.steps[i];
    if (!step) break;
    const ids = new Set(step.frames.map((f) => f.id));
    const popped = previous.filter((f) => !ids.has(f.id));
    popped.forEach((f) => {
      const node = nodes.get(f.id);
      if (node) node.status = "returned";
    });
    const topPopped = popped.at(-1);
    if (topPopped && step.returned) {
      const node = nodes.get(topPopped.id);
      if (node) node.returnValue = formatValue(step.returned.value, step.heap);
    }
    step.frames.forEach((frame, depth) => {
      if (nodes.has(frame.id)) return;
      const parentId = depth > 0 ? (step.frames[depth - 1]?.id ?? null) : null;
      const args = frame.locals
        .filter((l) => l.name !== "this" && !(frame.method === "main" && l.name === "args"))
        .map((l) => `${l.name} = ${formatValue(l.value, step.heap)}`)
        .join(", ");
      nodes.set(frame.id, { id: frame.id, method: frame.method, args, parentId, depth, status: "active", children: [] });
      if (parentId) nodes.get(parentId)?.children.push(frame.id);
      else roots.push(frame.id);
    });
    previous = step.frames;
  }
  const last = trace.steps[upto];
  const currentId = last?.frames.at(-1)?.id;
  if (currentId) {
    const node = nodes.get(currentId);
    if (node) node.status = "current";
  }
  return { roots, nodes };
}

/**
 * Keys (`frameId:name`) of locals that are new or changed compared with the previous step.
 * A reference only counts as changed when it points at a different object.
 */
export function changedLocals(prev: Step | undefined, step: Step | undefined): Set<string> {
  const changed = new Set<string>();
  if (!step) return changed;
  const before = new Map<string, string>();
  prev?.frames.forEach((f) => f.locals.forEach((l) => before.set(`${f.id}:${l.name}`, valueKey(l.value, prev.heap))));
  step.frames.forEach((f) =>
    f.locals.forEach((l) => {
      const key = `${f.id}:${l.name}`;
      if (before.get(key) !== valueKey(l.value, step.heap)) changed.add(key);
    }),
  );
  return changed;
}

/** Plain-English description of what a value is, e.g. "an empty ArrayList" or "an int array of length 3". */
export function describeValue(value: Value, heap: Heap): string {
  if (value.kind !== "ref") return formatValue(value, heap);
  const obj = heap[value.heapId];
  if (!obj) return "an object";
  switch (obj.kind) {
    case "string":
      return JSON.stringify(obj.value);
    case "array":
      return `${/^[aeiou]/i.test(obj.elementType) ? "an" : "a"} ${obj.elementType} array of length ${obj.length}`;
    case "list":
    case "set":
    case "map":
      return obj.size === 0
        ? `an empty ${obj.className}`
        : `a ${obj.className} with ${obj.size} ${obj.kind === "map" ? (obj.size === 1 ? "entry" : "entries") : obj.size === 1 ? "element" : "elements"}`;
    case "object":
      return `${/^[aeiou]/i.test(obj.className) ? "an" : "a"} ${obj.className} object`;
    default: {
      const exhaustive: never = obj;
      return exhaustive;
    }
  }
}

/** A readable name for each heap object: the local variable (or field) that refers to it. */
export function heapObjectNames(step: Step): Map<string, string> {
  const names = new Map<string, string>();
  const frames = [...step.frames].reverse(); // current frame first
  for (const frame of frames) {
    for (const local of frame.locals) {
      if (local.value.kind === "ref" && !names.has(local.value.heapId)) names.set(local.value.heapId, local.name);
    }
  }
  for (const [id, name] of [...names]) {
    const obj = step.heap[id];
    if (obj?.kind !== "object") continue;
    for (const f of obj.fields) {
      if (f.value.kind === "ref" && !names.has(f.value.heapId)) names.set(f.value.heapId, `${name}.${f.name}`);
    }
  }
  return names;
}

/** Keys (`heapId:index` / `heapId:field`) of array cells and fields changed since the previous step. */
export function changedHeapSlots(prev: Step | undefined, step: Step | undefined): Set<string> {
  const changed = new Set<string>();
  if (!prev || !step) return changed;
  for (const [id, obj] of Object.entries(step.heap)) {
    const old = prev.heap[id];
    if (!old) continue;
    if (obj.kind === "array" && old.kind === "array") {
      obj.items.forEach((item, i) => {
        const before = old.items[i];
        if (!before || formatValue(before, prev.heap) !== formatValue(item, step.heap)) changed.add(`${id}:${i}`);
      });
    } else if (obj.kind === "object" && old.kind === "object") {
      obj.fields.forEach((f) => {
        const before = old.fields.find((o) => o.name === f.name);
        if (!before || formatValue(before.value, prev.heap) !== formatValue(f.value, step.heap)) changed.add(`${id}:${f.name}`);
      });
    }
  }
  return changed;
}
