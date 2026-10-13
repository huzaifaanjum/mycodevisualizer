"use client";

import { useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

const KEY_STEP = 2;

/**
 * Divider between two panels. `value` is the size of the first panel (left or top) as a percent of
 * the container. Drag it, use the arrow keys when it is focused, or double-click to reset.
 *
 * `direction="row"` splits side by side (a vertical bar); `direction="column"` stacks (a horizontal bar).
 */
export function SplitHandle({
  containerRef,
  direction = "row",
  label,
  value,
  onChange,
  min,
  max,
  defaultValue,
  className,
}: {
  containerRef: RefObject<HTMLElement | null>;
  direction?: "row" | "column";
  label: string;
  value: number;
  onChange: (percent: number) => void;
  min: number;
  max: number;
  defaultValue: number;
  className?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const pointerId = useRef<number | null>(null);
  const row = direction === "row";
  const cursor = row ? "col-resize" : "row-resize";

  const percentAt = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return value;
    const size = row ? rect.width : rect.height;
    if (size === 0) return value;
    return ((row ? clientX - rect.left : clientY - rect.top) / size) * 100;
  };

  const stopDragging = (target: HTMLElement) => {
    if (pointerId.current !== null && target.hasPointerCapture(pointerId.current)) target.releasePointerCapture(pointerId.current);
    pointerId.current = null;
    setDragging(false);
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
  };

  const [back, forward] = row ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];

  return (
    <div
      role="separator"
      aria-orientation={row ? "vertical" : "horizontal"}
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      className={cn(
        "group relative flex touch-none items-center justify-center bg-border/40 outline-none select-none hover:bg-primary/30 focus-visible:bg-primary/40",
        row ? "w-2 cursor-col-resize" : "h-2 cursor-row-resize",
        dragging && "bg-primary/50",
        className,
      )}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        pointerId.current = e.pointerId;
        setDragging(true);
        document.body.style.cursor = cursor;
        document.body.style.userSelect = "none";
      }}
      onPointerMove={(e) => {
        if (pointerId.current === e.pointerId) onChange(percentAt(e.clientX, e.clientY));
      }}
      onPointerUp={(e) => stopDragging(e.currentTarget)}
      onPointerCancel={(e) => stopDragging(e.currentTarget)}
      onDoubleClick={() => onChange(defaultValue)}
      onKeyDown={(e) => {
        const next =
          e.key === back
            ? value - KEY_STEP
            : e.key === forward
              ? value + KEY_STEP
              : e.key === "Home"
                ? min
                : e.key === "End"
                  ? max
                  : e.key === "Enter"
                    ? defaultValue
                    : null;
        if (next === null) return;
        e.preventDefault();
        onChange(next);
      }}
    >
      <span aria-hidden className={cn("flex gap-1", row ? "flex-col" : "flex-row")}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1 rounded-full bg-muted-foreground/60 group-hover:bg-foreground" />
        ))}
      </span>
    </div>
  );
}
