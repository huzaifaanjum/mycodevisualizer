"use client";

import { HandIcon, LocateFixedIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { panToReveal, zoomAt, type View } from "@/lib/pan-zoom";
import { cn } from "@/lib/utils";

/** Pointer travel before a press becomes a drag, so clicks on boxes and buttons still work. */
const DRAG_THRESHOLD_PX = 4;
const PADDING = 16;
/** The floating glass bar that holds canvas controls (bottom-right), shared with other canvases. */
export const CANVAS_TOOLBAR_CLASS =
  "glass absolute right-3 bottom-3 z-10 flex items-center gap-0.5 rounded-xl border p-1 shadow-lg";

/** Spacing of the background dots at 100%, shared with the flowchart's dots. */
export const DOT_GAP = 16;

/**
 * A canvas you can pan and zoom, for any diagram made of plain HTML:
 * - drag to pan (on by default; the hand button turns it off so text can be selected),
 * - scroll to move around, Ctrl/⌘ + scroll or pinch to zoom toward the cursor,
 * - buttons to zoom out, back to 100%, zoom in, and recenter (back to the starting view).
 *
 * Clicks inside still work: a press only becomes a drag after a few pixels, and the click that
 * ends a drag is swallowed.
 */
export function PanZoomCanvas({
  children,
  label,
  insetLeft = 0,
  clip = true,
  focusSelector,
  focusKey,
  dotted = true,
  className,
}: {
  children: ReactNode;
  /** Accessible name of the canvas, e.g. "Memory diagram". */
  label: string;
  /** Pixels on the left covered by a floating panel; content starts and recenters beside it. */
  insetLeft?: number;
  /** Clip content at the canvas edge. Off lets it slide under floating panels (an ancestor clips). */
  clip?: boolean;
  /** When `focusKey` changes, the first element matching this selector is panned into view. */
  focusSelector?: string;
  focusKey?: unknown;
  /** The shared dotted background, which moves and scales with the content. */
  dotted?: boolean;
  className?: string;
}) {
  const start = useCallback((): View => ({ x: insetLeft + PADDING, y: PADDING, scale: 1 }), [insetLeft]);
  const [view, setView] = useState<View>(start);
  const [panMode, setPanMode] = useState(true);
  const [dragging, setDragging] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const touched = useRef(false);
  const drag = useRef<{ id: number; startX: number; startY: number; from: View; moved: boolean } | null>(null);
  const swallowClick = useRef(false);

  // Follow the starting position (e.g. once a floating panel has been measured) until the user moves.
  useEffect(() => {
    if (!touched.current) setView(start());
  }, [start]);

  const update = useCallback((next: (v: View) => View) => {
    touched.current = true;
    setView(next);
  }, []);

  // Wheel needs a non-passive listener to stop the page from scrolling or zooming.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        update((v) => zoomAt(v, v.scale * Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top));
      } else {
        update((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [update]);

  // Keep the focused element (e.g. the running call) on screen as it changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    const target = focusSelector ? contentRef.current?.querySelector<HTMLElement>(focusSelector) : null;
    if (!canvas || !target) return;
    const content = contentRef.current;
    if (!content) return;
    // The target's box inside the content, unscaled, so it is independent of the current pan/zoom.
    const k = content.offsetWidth > 0 ? content.getBoundingClientRect().width / content.offsetWidth : 1;
    const origin = content.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const box = { x: (t.left - origin.left) / k, y: (t.top - origin.top) / k, w: t.width / k, h: t.height / k };
    const viewport = { width: canvas.clientWidth - insetLeft, height: canvas.clientHeight };
    setView((v) => {
      const { dx, dy } = panToReveal(
        { left: v.x + box.x * v.scale - insetLeft, top: v.y + box.y * v.scale, width: box.w * v.scale, height: box.h * v.scale },
        viewport,
      );
      return dx === 0 && dy === 0 ? v : { ...v, x: v.x + dx, y: v.y + dy };
    });
  }, [focusSelector, focusKey, insetLeft]);

  const center = () => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return { x: insetLeft + ((rect?.width ?? 0) - insetLeft) / 2, y: (rect?.height ?? 0) / 2 };
  };
  const zoomTo = (scale: (current: number) => number) => {
    const c = center();
    update((v) => zoomAt(v, scale(v.scale), c.x, c.y));
  };
  /** Back to where the diagram started: its starting position at 100%. */
  const recenter = () => {
    touched.current = false;
    setView(start());
  };

  return (
    <div
      ref={canvasRef}
      role="group"
      aria-label={label}
      style={
        dotted
          ? {
              backgroundImage: "radial-gradient(var(--canvas-dot) 1px, transparent 1px)",
              backgroundSize: `${DOT_GAP * view.scale}px ${DOT_GAP * view.scale}px`,
              backgroundPosition: `${view.x}px ${view.y}px`,
            }
          : undefined
      }
      className={cn(
        "relative min-h-0 flex-1 touch-none",
        clip && "overflow-hidden",
        panMode && (dragging ? "cursor-grabbing select-none" : "cursor-grab"),
        className,
      )}
      onPointerDown={(e) => {
        if (!panMode || e.button !== 0) return;
        drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, from: view, moved: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (!d.moved) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
          d.moved = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
        }
        update(() => ({ ...d.from, x: d.from.x + dx, y: d.from.y + dy }));
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        if (d.moved) swallowClick.current = true;
        drag.current = null;
        setDragging(false);
      }}
      onPointerCancel={() => {
        drag.current = null;
        setDragging(false);
      }}
      onClickCapture={(e) => {
        // The click that ends a drag shouldn't also press whatever is under the pointer.
        if (!swallowClick.current) return;
        swallowClick.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
        ref={contentRef}
        data-pan-zoom-content
        className="absolute top-0 left-0 w-max origin-top-left"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
      >
        {children}
      </div>

      <div
        role="toolbar"
        aria-label="Canvas controls"
        className={CANVAS_TOOLBAR_CLASS}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <CanvasButton
          label={panMode ? "Panning on: drag to move around" : "Panning off: drag selects text"}
          pressed={panMode}
          onClick={() => setPanMode((p) => !p)}
        >
          <HandIcon />
        </CanvasButton>
        <CanvasButton label="Zoom out (Ctrl/⌘ + scroll)" onClick={() => zoomTo((s) => s / 1.2)}>
          <MinusIcon />
        </CanvasButton>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => zoomTo(() => 1)}
              className="text-muted-foreground hover:text-foreground w-11 rounded-md text-center font-mono text-xs tabular-nums"
              aria-label={`Zoom ${Math.round(view.scale * 100)}%. Reset to 100%`}
            >
              {Math.round(view.scale * 100)}%
            </button>
          </TooltipTrigger>
          <TooltipContent>Back to 100%</TooltipContent>
        </Tooltip>
        <CanvasButton label="Zoom in (Ctrl/⌘ + scroll)" onClick={() => zoomTo((s) => s * 1.2)}>
          <PlusIcon />
        </CanvasButton>
        <CanvasButton label="Recenter: back to the start" onClick={recenter}>
          <LocateFixedIcon />
        </CanvasButton>
      </div>
    </div>
  );
}

/** A canvas control button (icon only, tooltip from `label`), shared with other canvases. */
export function CanvasButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={pressed ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
          className={cn(pressed && "text-primary")}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
