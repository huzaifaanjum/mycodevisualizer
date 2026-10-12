"use client";

import { useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

const KEY_STEP = 2;

/**
 * Vertical divider between the code and the visualization. Drag it, use the arrow keys when it is
 * focused, or double-click to reset.
 */
export function SplitHandle({
  containerRef,
  value,
  onChange,
  min,
  max,
  defaultValue,
}: {
  containerRef: RefObject<HTMLElement | null>;
  value: number;
  onChange: (percent: number) => void;
  min: number;
  max: number;
  defaultValue: number;
}) {
  const [dragging, setDragging] = useState(false);
  const pointerId = useRef<number | null>(null);

  const percentAt = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return value;
    return ((clientX - rect.left) / rect.width) * 100;
  };

  const stopDragging = (target: HTMLElement) => {
    if (pointerId.current !== null && target.hasPointerCapture(pointerId.current)) target.releasePointerCapture(pointerId.current);
    pointerId.current = null;
    setDragging(false);
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize code panel"
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      className={cn(
        "group relative hidden w-2 cursor-col-resize touch-none items-center justify-center bg-border/40 outline-none select-none hover:bg-primary/30 focus-visible:bg-primary/40 lg:flex",
        dragging && "bg-primary/50",
      )}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        pointerId.current = e.pointerId;
        setDragging(true);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
      onPointerMove={(e) => {
        if (pointerId.current === e.pointerId) onChange(percentAt(e.clientX));
      }}
      onPointerUp={(e) => stopDragging(e.currentTarget)}
      onPointerCancel={(e) => stopDragging(e.currentTarget)}
      onDoubleClick={() => onChange(defaultValue)}
      onKeyDown={(e) => {
        const next =
          e.key === "ArrowLeft"
            ? value - KEY_STEP
            : e.key === "ArrowRight"
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
      <span aria-hidden className="flex flex-col gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1 rounded-full bg-muted-foreground/60 group-hover:bg-foreground" />
        ))}
      </span>
    </div>
  );
}
