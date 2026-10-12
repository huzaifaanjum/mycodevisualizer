import { MinusIcon, PlusIcon } from "lucide-react";
import type { CollectionObject, Heap } from "@/shared/trace";
import { cn } from "@/lib/utils";
import type { CollectionDiff, ItemChange, ListDiff, MapDiff, RemovedItem } from "../lib/collection-diff";
import { ValueText } from "./value-text";
import { VariableNames } from "./variable-names";

/** How to read the order of each kind of collection. */
const ORDER_HINTS: Record<string, string> = {
  ArrayDeque: "front → back",
  LinkedList: "first → last",
  Stack: "bottom → top",
  PriorityQueue: "heap order · smallest at index 0",
  TreeMap: "sorted by key",
  TreeSet: "sorted",
  LinkedHashMap: "insertion order",
  LinkedHashSet: "insertion order",
};

const statusClass = (status: ItemChange["status"] | undefined) =>
  status === "added" ? "bg-primary/15 ring-1 ring-primary/70 mcv-frame-in" : status === "changed" ? "mcv-changed" : undefined;

function StatusMark({ change }: { change: ItemChange | undefined }) {
  if (change?.status === "added") return <span className="sr-only">(added)</span>;
  if (change?.status === "changed") return <span className="sr-only">(changed from {change.from})</span>;
  return null;
}

export function CollectionBox({
  id,
  object,
  heap,
  diff,
  names,
}: {
  id: string;
  object: CollectionObject;
  heap: Heap;
  diff: CollectionDiff | null;
  /** Variables that refer to this collection. */
  names: string[];
}) {
  const shown = object.kind === "map" ? object.entries.length : object.items.length;
  const hidden = object.size - shown;
  const hint = ORDER_HINTS[object.className];
  return (
    <figure data-heap-id={id} className="mcv-frame-in w-fit max-w-full">
      <figcaption className="mb-1 flex flex-wrap items-baseline gap-x-2 font-mono text-[11px] text-muted-foreground">
        <VariableNames names={names} />
        <span className="font-semibold text-foreground">{object.className}</span>
        <span>size {object.size}</span>
        {hint && <span className="font-sans italic">{hint}</span>}
      </figcaption>
      {object.size === 0 && (!diff || diff.removed.length === 0) ? (
        <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">empty</div>
      ) : object.kind === "map" ? (
        <MapTable id={id} object={object} heap={heap} diff={diff?.kind === "map" ? diff : null} />
      ) : object.kind === "set" ? (
        <SetChips id={id} items={object.items} heap={heap} diff={diff && diff.kind !== "map" ? diff : null} />
      ) : (
        <ListCells id={id} items={object.items} heap={heap} diff={diff && diff.kind !== "map" ? diff : null} />
      )}
      {hidden > 0 && <p className="mt-1 text-[11px] text-muted-foreground">+{hidden} more not shown</p>}
    </figure>
  );
}

type Slot = { type: "item"; index: number } | { type: "ghost"; removed: RemovedItem };

/** New items in order, with removed items shown as ghosts near where they used to be. */
function withGhosts(count: number, removed: RemovedItem[]): Slot[] {
  const slots: Slot[] = Array.from({ length: count }, (_, index) => ({ type: "item", index }));
  removed.forEach((r, k) => slots.splice(Math.min(r.index + k, slots.length), 0, { type: "ghost", removed: r }));
  return slots;
}

function Ghost({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-danger line-through decoration-danger/70" title="Removed in this step">
      <MinusIcon className="size-3 no-underline" aria-hidden />
      {text}
      <span className="sr-only">(removed)</span>
    </span>
  );
}

function ListCells({
  id,
  items,
  heap,
  diff,
}: {
  id: string;
  items: Extract<CollectionObject, { kind: "list" }>["items"];
  heap: Heap;
  diff: ListDiff | null;
}) {
  return (
    <div className="flex flex-wrap overflow-hidden rounded-md border">
      {withGhosts(items.length, diff?.removed ?? []).map((slot) => {
        if (slot.type === "ghost") {
          return (
            <div key={`ghost-${slot.removed.index}`} className="flex min-w-10 flex-col items-center border-r border-dashed border-danger/50 bg-danger/10 last:border-r-0">
              <div className="w-full px-1.5 text-center font-mono text-[10px] text-danger/80">{slot.removed.index}</div>
              <div className="px-1.5 py-1 font-mono text-xs">
                <Ghost text={slot.removed.display} />
              </div>
            </div>
          );
        }
        const change = diff?.items[slot.index];
        const item = items[slot.index];
        if (!item) return null;
        return (
          <div key={slot.index} className={cn("flex min-w-10 flex-col items-center border-r last:border-r-0", statusClass(change?.status))}>
            <div className="w-full bg-muted px-1.5 text-center font-mono text-[10px] text-muted-foreground">
              {change?.status === "added" ? <PlusIcon className="mx-auto size-2.5 text-primary" aria-hidden /> : slot.index}
            </div>
            <div className="px-1.5 py-1 text-xs" title={change?.status === "changed" ? `was ${change.from}` : undefined}>
              <ValueText value={item} heap={heap} sourceId={`${id}:${slot.index}`} />
              <StatusMark change={change} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SetChips({
  id,
  items,
  heap,
  diff,
}: {
  id: string;
  items: Extract<CollectionObject, { kind: "set" }>["items"];
  heap: Heap;
  diff: ListDiff | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border px-2 py-1.5 font-mono text-xs">
      <span className="text-muted-foreground" aria-hidden>
        {"{"}
      </span>
      {items.map((item, i) => {
        const change = diff?.items[i];
        return (
          <span key={i} className={cn("rounded border px-1.5 py-0.5", statusClass(change?.status))}>
            <ValueText value={item} heap={heap} sourceId={`${id}:${i}`} />
            <StatusMark change={change} />
          </span>
        );
      })}
      {diff?.removed.map((r) => (
        <span key={`ghost-${r.index}`} className="rounded border border-dashed border-danger/50 bg-danger/10 px-1.5 py-0.5">
          <Ghost text={r.display} />
        </span>
      ))}
      <span className="text-muted-foreground" aria-hidden>
        {"}"}
      </span>
    </div>
  );
}

function MapTable({
  id,
  object,
  heap,
  diff,
}: {
  id: string;
  object: Extract<CollectionObject, { kind: "map" }>;
  heap: Heap;
  diff: MapDiff | null;
}) {
  return (
    <table className="min-w-36 overflow-hidden rounded-md border text-xs">
      <thead>
        <tr className="bg-muted text-[10px] text-muted-foreground">
          <th className="px-2 py-0.5 text-left font-normal">key</th>
          <th className="px-2 py-0.5 text-left font-normal">value</th>
        </tr>
      </thead>
      <tbody>
        {object.entries.map((entry, i) => {
          const change = diff?.entries[i];
          return (
            <tr key={i} className={cn("border-t", change?.status === "added" && "bg-primary/15 mcv-frame-in")}>
              <td className="py-1 pr-3 pl-2 font-mono">
                {change?.status === "added" && <PlusIcon className="mr-1 inline size-3 text-primary" aria-hidden />}
                <ValueText value={entry.key} heap={heap} sourceId={`${id}:k${i}`} />
              </td>
              <td className={cn("py-1 pr-2 pl-1 font-mono", change?.status === "changed" && "mcv-changed")}>
                {change?.status === "changed" && (
                  <span className="mr-1 text-muted-foreground line-through" aria-hidden>
                    {change.from}
                  </span>
                )}
                <ValueText value={entry.value} heap={heap} sourceId={`${id}:v${i}`} />
                <StatusMark change={change} />
              </td>
            </tr>
          );
        })}
        {diff?.removed.map((r, i) => (
          <tr key={`ghost-${i}`} className="border-t border-dashed bg-danger/10">
            <td className="py-1 pr-3 pl-2 font-mono">
              <Ghost text={r.keyDisplay} />
            </td>
            <td className="py-1 pr-2 pl-1 font-mono text-danger/80 line-through">{r.valueDisplay}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
