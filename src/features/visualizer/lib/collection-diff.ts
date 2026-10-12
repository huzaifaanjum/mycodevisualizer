import type { CollectionObject, Heap, Step, Value } from "@/shared/trace";
import { formatValue, valueKey } from "./trace-helpers";

export type SlotStatus = "same" | "added" | "changed";

export interface ItemChange {
  status: SlotStatus;
  /** Previous display text, for "changed". */
  from?: string;
}

export interface RemovedItem {
  /** Position the item had before (lists) or its order in the old iteration (sets). */
  index: number;
  display: string;
  value: Value;
}

export interface ListDiff {
  kind: "list" | "set";
  /** One entry per item of the new collection, by index. */
  items: ItemChange[];
  removed: RemovedItem[];
}

export interface MapDiff {
  kind: "map";
  /** One entry per entry of the new map, by index. Status refers to the entry (added) or its value (changed). */
  entries: ItemChange[];
  removed: { key: Value; keyDisplay: string; valueDisplay: string }[];
}

export type CollectionDiff = ListDiff | MapDiff;

const isTruncated = (c: CollectionObject) => c.size > (c.kind === "map" ? c.entries.length : c.items.length);

/**
 * Aligns two sequences with a longest-common-subsequence so an insertion in the middle shows as one
 * added item instead of every later item "changing". Adjacent delete+insert pairs become "changed"
 * (that's what list.set(i, x) looks like).
 */
export function diffSequence(
  before: Value[],
  beforeHeap: Heap,
  after: Value[],
  afterHeap: Heap,
  options: { pairReplacements: boolean; beforeTruncated: boolean; afterTruncated: boolean },
): { items: ItemChange[]; removed: RemovedItem[] } {
  const a = before.map((v) => valueKey(v, beforeHeap));
  const b = after.map((v) => valueKey(v, afterHeap));
  const n = a.length;
  const m = b.length;
  // lcs(i, j) = length of the longest common subsequence of a[i..] and b[j..].
  const table = new Int32Array((n + 1) * (m + 1));
  const lcs = (i: number, j: number) => table[i * (m + 1) + j] ?? 0;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * (m + 1) + j] = a[i] === b[j] ? lcs(i + 1, j + 1) + 1 : Math.max(lcs(i + 1, j), lcs(i, j + 1));
    }
  }

  type Op = { op: "same"; i: number; j: number } | { op: "del"; i: number } | { op: "ins"; j: number };
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) ops.push({ op: "same", i: i++, j: j++ });
    // On ties prefer deleting first, so a delete+insert at the same spot can pair up as a replacement.
    else if (j < m && (i >= n || lcs(i, j + 1) > lcs(i + 1, j))) ops.push({ op: "ins", j: j++ });
    else ops.push({ op: "del", i: i++ });
  }

  // Items that merely slid into or out of a truncated view are not real changes.
  let lastSame = -1;
  ops.forEach((o, k) => {
    if (o.op === "same") lastSame = k;
  });
  const items: ItemChange[] = after.map(() => ({ status: "same" }));
  const removed: RemovedItem[] = [];
  let pendingDeletes: number[] = [];
  const flushDeletes = () => {
    for (const di of pendingDeletes) {
      const value = before[di];
      if (value) removed.push({ index: di, display: formatValue(value, beforeHeap), value });
    }
    pendingDeletes = [];
  };
  ops.forEach((o, k) => {
    const trailing = k > lastSame;
    if (o.op === "same") {
      flushDeletes();
    } else if (o.op === "del") {
      if (!(trailing && options.beforeTruncated)) pendingDeletes.push(o.i);
    } else {
      if (trailing && options.afterTruncated) return;
      const paired = options.pairReplacements ? pendingDeletes.shift() : undefined;
      const old = paired !== undefined ? before[paired] : undefined;
      items[o.j] = old ? { status: "changed", from: formatValue(old, beforeHeap) } : { status: "added" };
    }
  });
  flushDeletes();
  return { items, removed: removed.sort((x, y) => x.index - y.index) };
}

function diffSet(before: Extract<CollectionObject, { kind: "set" }>, beforeHeap: Heap, after: Extract<CollectionObject, { kind: "set" }>, afterHeap: Heap): ListDiff {
  const truncated = isTruncated(before) || isTruncated(after);
  const oldKeys = new Set(before.items.map((v) => valueKey(v, beforeHeap)));
  const newKeys = new Set(after.items.map((v) => valueKey(v, afterHeap)));
  const reportAdded = !truncated || after.size > before.size;
  const reportRemoved = !truncated || after.size < before.size;
  return {
    kind: "set",
    items: after.items.map((v) => ({ status: reportAdded && !oldKeys.has(valueKey(v, afterHeap)) ? "added" : "same" })),
    removed: reportRemoved
      ? before.items.flatMap((value, index) =>
          newKeys.has(valueKey(value, beforeHeap)) ? [] : [{ index, display: formatValue(value, beforeHeap), value }],
        )
      : [],
  };
}

function diffMap(before: Extract<CollectionObject, { kind: "map" }>, beforeHeap: Heap, after: Extract<CollectionObject, { kind: "map" }>, afterHeap: Heap): MapDiff {
  const truncated = isTruncated(before) || isTruncated(after);
  const old = new Map(before.entries.map((e) => [valueKey(e.key, beforeHeap), e]));
  const newKeys = new Set(after.entries.map((e) => valueKey(e.key, afterHeap)));
  const reportAdded = !truncated || after.size > before.size;
  const reportRemoved = !truncated || after.size < before.size;
  return {
    kind: "map",
    entries: after.entries.map((e) => {
      const previous = old.get(valueKey(e.key, afterHeap));
      if (!previous) return { status: reportAdded ? "added" : "same" };
      const was = formatValue(previous.value, beforeHeap);
      return valueKey(previous.value, beforeHeap) === valueKey(e.value, afterHeap) ? { status: "same" } : { status: "changed", from: was };
    }),
    removed: reportRemoved
      ? before.entries.flatMap((e) =>
          newKeys.has(valueKey(e.key, beforeHeap))
            ? []
            : [{ key: e.key, keyDisplay: formatValue(e.key, beforeHeap), valueDisplay: formatValue(e.value, beforeHeap) }],
        )
      : [],
  };
}

/** Changes to one collection between two steps, or null if it is new or unchanged. */
export function diffCollection(heapId: string, prev: Step | undefined, step: Step | undefined): CollectionDiff | null {
  const before = prev?.heap[heapId];
  const after = step?.heap[heapId];
  if (!prev || !step || !before || !after || before.kind !== after.kind) return null;
  let diff: CollectionDiff;
  if (after.kind === "map" && before.kind === "map") {
    diff = diffMap(before, prev.heap, after, step.heap);
  } else if (after.kind === "set" && before.kind === "set") {
    diff = diffSet(before, prev.heap, after, step.heap);
  } else if (after.kind === "list" && before.kind === "list") {
    diff = {
      kind: "list",
      ...diffSequence(before.items, prev.heap, after.items, step.heap, {
        pairReplacements: true,
        beforeTruncated: isTruncated(before),
        afterTruncated: isTruncated(after),
      }),
    };
  } else {
    return null;
  }
  return hasChanges(diff) ? diff : null;
}

export function hasChanges(diff: CollectionDiff): boolean {
  const statuses = diff.kind === "map" ? diff.entries : diff.items;
  return diff.removed.length > 0 || statuses.some((s) => s.status !== "same");
}
