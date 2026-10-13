"use client";

import { BoxesIcon, CornerDownLeftIcon, FlagIcon, LayersIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { InfoTip } from "@/components/common/info-tip";
import type { Step } from "@/shared/trace";
import { cn } from "@/lib/utils";
import { diffCollection } from "../lib/collection-diff";
import { EXPLAIN, type Explanation } from "../lib/explanations";
import { withExiting } from "../lib/presence";
import { changedHeapSlots, changedLocals, drawableHeap, heapObjectLabels } from "../lib/trace-helpers";
import { FrameCard } from "./frame-card";
import { HeapObjectBox } from "./heap-object";
import { ReferenceArrows } from "./reference-arrows";

const NO_CHANGES = new Set<string>();
const NO_LABELS = new Map<string, string[]>();

/** Stack frames on the left, heap arrays/objects on the right, arrows for references between them. */
export function MemoryView({
  step,
  previousStep,
  finished = false,
  zoom = 100,
  returnedCall,
}: {
  step: Step | undefined;
  previousStep: Step | undefined;
  /** The program has ended: `step` is the last moment it was running, shown as its final state. */
  finished?: boolean;
  /** Content zoom in percent. The arrow layer stays unzoomed and measures the zoomed boxes. */
  zoom?: number;
  /** The call that just returned, as it was called (e.g. "factorial(3)"). */
  returnedCall?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // The step shown before this one (not always `previousStep`: the learner can jump around).
  // Frames and objects that vanished since then are kept briefly so they can animate out.
  const [shown, setShown] = useState<{ step: Step | undefined; before: Step | undefined }>({
    step,
    before: undefined,
  });
  if (shown.step !== step) setShown({ step, before: shown.step });
  const before = shown.step === step ? shown.before : undefined;

  const changed = useMemo(() => changedLocals(previousStep, step), [previousStep, step]);
  const changedSlots = useMemo(() => changedHeapSlots(previousStep, step), [previousStep, step]);
  const labels = useMemo(() => (step ? heapObjectLabels(step) : NO_LABELS), [step]);
  const beforeLabels = useMemo(() => (before ? heapObjectLabels(before) : NO_LABELS), [before]);
  const frames = useMemo(
    () =>
      withExiting([...(step?.frames ?? [])].reverse(), [...(before?.frames ?? [])].reverse(), (f) => f.id),
    [step, before],
  );
  const heapObjects = useMemo(
    () => withExiting(drawableHeap(step), drawableHeap(before), ([id]) => id),
    [step, before],
  );
  const liveFrames = step?.frames.length ?? 0;
  const liveObjects = heapObjects.filter((o) => !o.exiting).length;
  const arrowDeps = useMemo(() => ({ step, zoom }), [step, zoom]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-auto p-4">
        <div style={{ zoom: zoom / 100 }}>
          {finished && (
            <p
              role="status"
              className="border-primary/30 bg-primary/10 text-primary mb-4 flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs"
            >
              <FlagIcon className="size-3.5" aria-hidden />
              Program finished. This is the final state of memory, just before main() ended.
            </p>
          )}
          <div className="grid min-w-fit grid-cols-[minmax(14rem,1fr)_minmax(11rem,1fr)] items-start gap-x-16">
            <Region
              icon={<LayersIcon className="size-3.5" aria-hidden />}
              info={EXPLAIN.callStack}
              meta={
                liveFrames > 0
                  ? `${liveFrames} ${liveFrames === 1 ? "frame" : "frames"} · newest on top`
                  : undefined
              }
              gap="0.75rem"
            >
              {liveFrames === 0 && <p className="text-muted-foreground text-xs">The stack is empty.</p>}
              {frames.map(({ key, item: frame, exiting }) => (
                <Exit key={key} exiting={exiting}>
                  <FrameCard
                    frame={frame}
                    heap={(exiting ? before : step)?.heap ?? {}}
                    isCurrent={!exiting && frame.id === step?.frames.at(-1)?.id}
                    explained={!exiting && frame.id === step?.frames.at(-1)?.id}
                    finished={finished}
                    changed={exiting ? NO_CHANGES : changed}
                    received={
                      !exiting && frame.id === step?.frames.at(-1)?.id && step?.returned
                        ? { ...step.returned, call: returnedCall }
                        : undefined
                    }
                    returning={exiting && step?.returned?.method === frame.method ? step.returned.value : undefined}
                  />
                </Exit>
              ))}
            </Region>
            <Region
              icon={<BoxesIcon className="size-3.5" aria-hidden />}
              info={EXPLAIN.heap}
              meta={
                liveObjects > 0 ? `${liveObjects} ${liveObjects === 1 ? "object" : "objects"}` : undefined
              }
              gap="1.25rem"
              className="bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[14px_14px]"
            >
              {liveObjects === 0 && (
                <p className="text-muted-foreground text-xs">No arrays or objects yet.</p>
              )}
              {heapObjects.map(({ key, item: [id, obj], exiting }) => (
                <Exit key={key} exiting={exiting}>
                  <HeapObjectBox
                    id={id}
                    object={obj}
                    heap={(exiting ? before : step)?.heap ?? {}}
                    changed={exiting ? NO_CHANGES : changedSlots}
                    names={(exiting ? beforeLabels : labels).get(id) ?? []}
                    collectionDiff={exiting ? null : diffCollection(id, previousStep, step)}
                  />
                </Exit>
              ))}
            </Region>
          </div>
        </div>
        <ReferenceArrows containerRef={containerRef} deps={arrowDeps} />
      </div>
    </div>
  );
}

/** Explains the memory view's visual cues once, so every box can stay uncluttered. */
export function MemoryLegend() {
  return (
    <ul
      aria-label="Legend"
      className="text-muted-foreground flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-1.5 text-[11px]"
    >
      <li className="flex items-center gap-1.5">
        <span className="bg-primary inline-block size-2.5 rounded-full" aria-hidden />
        <span className="bg-primary inline-block h-px w-4" aria-hidden />
        reference (points to the heap)
      </li>
      <li className="flex items-center gap-1.5">
        <span className="bg-changed/25 ring-changed inline-block h-3 w-4 rounded-sm ring-1" aria-hidden />
        changed in this step
      </li>
      <li className="flex items-center gap-1.5">
        <PlusIcon className="text-primary size-3" aria-hidden />
        added
      </li>
      <li className="flex items-center gap-1.5">
        <MinusIcon className="text-danger size-3" aria-hidden />
        <span className="line-through">removed</span>
      </li>
      <li className="flex items-center gap-1.5">
        <span className="bg-primary inline-block h-3 w-1 rounded-full" aria-hidden />
        method running now
      </li>
      <li className="flex items-center gap-1.5">
        <CornerDownLeftIcon className="text-changed size-3" aria-hidden />
        value handed back by a method
      </li>
    </ul>
  );
}

function Region({
  icon,
  info,
  meta,
  gap,
  className,
  children,
}: {
  icon: ReactNode;
  info: Explanation;
  meta: string | undefined;
  /** Space between items; exiting items pull it back in as they collapse. */
  gap: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={info.title}
      className={cn("bg-muted/20 flex min-h-24 flex-col rounded-xl border border-dashed p-3", className)}
      style={{ gap, "--mcv-gap": gap } as CSSProperties}
    >
      <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
        {icon}
        <h3 className="font-semibold tracking-wider uppercase">{info.title}</h3>
        <InfoTip title={info.title} text={info.text} />
        {meta && <span className="ml-auto">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

/**
 * Wraps every item the same way, so an item that starts leaving keeps its DOM (no replayed entry
 * animation): it fades out, then collapses so the rest slides into place.
 */
function Exit({ exiting, children }: { exiting: boolean; children: ReactNode }) {
  return (
    <div
      data-exiting={exiting || undefined}
      aria-hidden={exiting || undefined}
      className={cn("grid", exiting && "mcv-exit pointer-events-none")}
    >
      <div className={cn("min-w-0", exiting && "min-h-0 overflow-hidden")}>{children}</div>
    </div>
  );
}
