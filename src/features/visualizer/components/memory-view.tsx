"use client";

import { useMemo, useRef } from "react";
import type { Step } from "@/shared/trace";
import { diffCollection } from "../lib/collection-diff";
import { changedHeapSlots, changedLocals, drawableHeap } from "../lib/trace-helpers";
import { FrameCard } from "./frame-card";
import { HeapObjectBox } from "./heap-object";
import { ReferenceArrows } from "./reference-arrows";

/** Stack frames on the left, heap arrays/objects on the right, arrows for references between them. */
export function MemoryView({ step, previousStep }: { step: Step | undefined; previousStep: Step | undefined }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const changed = useMemo(() => changedLocals(previousStep, step), [previousStep, step]);
  const changedSlots = useMemo(() => changedHeapSlots(previousStep, step), [previousStep, step]);
  const heapObjects = useMemo(() => drawableHeap(step), [step]);
  const frames = step?.frames ?? [];

  return (
    <div ref={containerRef} className="relative h-full overflow-auto p-3">
      <div className="grid min-w-fit grid-cols-[minmax(13rem,1fr)_minmax(10rem,1fr)] gap-x-12 gap-y-3">
        <div className="flex flex-col gap-2">
          <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Call stack {frames.length > 0 && <span className="font-normal normal-case">(newest on top)</span>}
          </h3>
          {frames.length === 0 ? (
            <p className="text-xs text-muted-foreground">The stack is empty.</p>
          ) : (
            [...frames]
              .reverse()
              .map((frame, i) => (
                <FrameCard key={frame.id} frame={frame} heap={step?.heap ?? {}} isCurrent={i === 0} changed={changed} />
              ))
          )}
        </div>
        <div className="flex flex-col gap-4">
          <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Heap</h3>
          {heapObjects.length === 0 ? (
            <p className="text-xs text-muted-foreground">No arrays or objects yet.</p>
          ) : (
            heapObjects.map(([id, obj]) => (
              <HeapObjectBox
                key={id}
                id={id}
                object={obj}
                heap={step?.heap ?? {}}
                changed={changedSlots}
                collectionDiff={diffCollection(id, previousStep, step)}
              />
            ))
          )}
        </div>
      </div>
      <ReferenceArrows containerRef={containerRef} deps={step} />
    </div>
  );
}
