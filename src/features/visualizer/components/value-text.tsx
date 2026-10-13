import type { Heap, Value } from "@/shared/trace";
import { cn } from "@/lib/utils";
import { formatValue, isDrawnOnHeap } from "../lib/trace-helpers";

/**
 * Renders a value inline. Arrays and objects render as an arrow anchor (the MemoryView draws the
 * arrow to the heap box); primitives, Strings and null render as text.
 */
export function ValueText({
  value,
  heap,
  sourceId,
  changed,
}: {
  value: Value;
  heap: Heap;
  /** Unique id for the arrow source, required for references drawn on the heap. */
  sourceId: string;
  changed?: boolean;
}) {
  if (isDrawnOnHeap(value, heap)) {
    return (
      <span
        className="text-muted-foreground inline-flex items-center gap-1"
        title={formatValue(value, heap)}
        aria-label={`reference to ${formatValue(value, heap)}`}
      >
        <span
          data-ref-source={sourceId}
          data-ref-target={value.heapId}
          className={cn(
            "bg-primary inline-block size-2.5 rounded-full",
            changed && "mcv-dot-pop ring-changed ring-2",
          )}
        />
      </span>
    );
  }
  const text = formatValue(value, heap);
  return (
    <span
      key={text}
      className={cn(
        "inline-block rounded px-1 font-mono",
        value.kind === "null" && "text-muted-foreground italic",
        changed && "mcv-changed",
      )}
    >
      {text}
    </span>
  );
}
