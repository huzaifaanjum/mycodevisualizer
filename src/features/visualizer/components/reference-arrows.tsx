"use client";

import { useLayoutEffect, useState } from "react";

interface Arrow {
  /** Source + target, so a reference that now points elsewhere draws in again. */
  key: string;
  source: string;
  target: string;
  line: string;
  head: string;
}

interface Box {
  left: number;
  right: number;
  top: number;
  height: number;
}

const HEAD = 7;
/** How long arrows keep following boxes after an entry/exit animation starts. */
const FOLLOW_MS = 500;

/**
 * One curve from a reference dot at (sx, sy) to a heap box. Targets to the right or left get an
 * S-curve into the near edge; targets in the same column (heap to heap) loop around the right side.
 */
export function routeArrow(sx: number, sy: number, t: Box): { line: string; head: string } {
  const ty = t.top + Math.min(14, t.height / 2);
  let dir: 1 | -1;
  let tip: number;
  let c1: number;
  let c2: number;
  if (t.left >= sx + 12) {
    dir = 1;
    tip = t.left - 2;
    const bend = Math.max(30, (tip - sx) / 2);
    c1 = sx + bend;
    c2 = tip - HEAD - bend;
  } else if (t.right <= sx - 12) {
    dir = -1;
    tip = t.right + 2;
    const bend = Math.max(30, (sx - tip) / 2);
    c1 = sx - bend;
    c2 = tip + HEAD + bend;
  } else {
    dir = -1;
    tip = t.right + 2;
    const out = Math.max(sx, tip) + 28 + Math.min(60, Math.abs(ty - sy) * 0.2);
    c1 = out;
    c2 = out;
  }
  const end = tip - dir * HEAD;
  return {
    line: `M ${sx} ${sy} C ${c1} ${sy}, ${c2} ${ty}, ${end} ${ty}`,
    head: `M ${tip} ${ty} L ${end} ${ty - HEAD / 1.6} L ${end} ${ty + HEAD / 1.6} Z`,
  };
}

/**
 * Draws SVG arrows from every [data-ref-source] dot to the [data-heap-id] box it points to.
 * Positions are measured from the DOM so layout stays plain HTML/CSS; while boxes animate the
 * arrows follow them frame by frame. Hovering a dot, frame or heap box highlights its arrows.
 */
export function ReferenceArrows({
  container,
  deps,
}: {
  /**
   * The scrolling element that holds the stack and heap. Passed as an element (not a ref) so the
   * arrows measure as soon as it exists: a parent's ref isn't attached yet when a child's layout
   * effect runs on mount (entering full screen or switching back to the Memory tab remounts it).
   */
  container: HTMLElement | null;
  deps: unknown;
}) {
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [focus, setFocus] = useState<Set<string> | null>(null);

  useLayoutEffect(() => {
    if (!container) return;
    let signature = "";
    const measure = () => {
      const base = container.getBoundingClientRect();
      // Screen pixels per layout pixel: 1 normally, the zoom level on a pan/zoom canvas (an
      // ancestor's transform scales everything, including this arrow layer).
      const k = container.offsetWidth > 0 ? base.width / container.offsetWidth : 1;
      const localX = (x: number) => (x - base.left) / k + container.scrollLeft;
      const localY = (y: number) => (y - base.top) / k + container.scrollTop;
      const next: Arrow[] = [];
      container.querySelectorAll<HTMLElement>("[data-ref-source]").forEach((source) => {
        const target = source.dataset.refTarget;
        const sourceKey = source.dataset.refSource;
        if (!target || !sourceKey || source.closest("[data-exiting]")) return;
        const box = [
          ...container.querySelectorAll<HTMLElement>(`[data-heap-id="${CSS.escape(target)}"]`),
        ].find((el) => !el.closest("[data-exiting]"));
        if (!box) return;
        const s = source.getBoundingClientRect();
        const t = box.getBoundingClientRect();
        const route = routeArrow(localX(s.left + s.width / 2), localY(s.top + s.height / 2), {
          left: localX(t.left),
          right: localX(t.right),
          top: localY(t.top),
          height: t.height / k,
        });
        next.push({ key: `${sourceKey}->${target}`, source: sourceKey, target, ...route });
      });
      const nextSignature = `${container.scrollWidth}x${container.scrollHeight}|${next.map((a) => a.key + a.line).join("|")}`;
      if (nextSignature === signature) return;
      signature = nextSignature;
      setArrows(next);
      setSize({ width: container.scrollWidth, height: container.scrollHeight });
    };

    let frame = 0;
    let followUntil = 0;
    const tick = () => {
      measure();
      frame = performance.now() < followUntil ? requestAnimationFrame(tick) : 0;
    };
    const startFollowing = () => {
      followUntil = performance.now() + FOLLOW_MS;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const follow = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("[data-arrow-layer]")) return;
      startFollowing();
    };

    measure();
    startFollowing();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    if (container.firstElementChild) observer.observe(container.firstElementChild);
    container.addEventListener("animationstart", follow);
    container.addEventListener("transitionrun", follow);
    return () => {
      observer.disconnect();
      container.removeEventListener("animationstart", follow);
      container.removeEventListener("transitionrun", follow);
      cancelAnimationFrame(frame);
    };
  }, [container, deps]);

  useLayoutEffect(() => {
    if (!container) return;
    const onOver = (event: PointerEvent) => {
      const el = event.target instanceof Element ? event.target : null;
      const region = el?.closest<HTMLElement>("[data-ref-source], [data-heap-id], [data-frame]");
      if (!region || region.closest("[data-exiting]")) return setFocus(null);
      const keys = new Set<string>();
      const sources = region.matches("[data-ref-source]")
        ? [region]
        : [...region.querySelectorAll<HTMLElement>("[data-ref-source]")];
      sources.forEach((s) => s.dataset.refSource && keys.add(`source:${s.dataset.refSource}`));
      if (region.dataset.heapId) keys.add(`target:${region.dataset.heapId}`);
      setFocus(keys.size > 0 ? keys : null);
    };
    const onLeave = () => setFocus(null);
    container.addEventListener("pointerover", onOver);
    container.addEventListener("pointerleave", onLeave);
    return () => {
      container.removeEventListener("pointerover", onOver);
      container.removeEventListener("pointerleave", onLeave);
    };
  }, [container]);

  const isFocused = (a: Arrow) => focus?.has(`source:${a.source}`) || focus?.has(`target:${a.target}`);

  return (
    <svg
      aria-hidden
      data-arrow-layer
      className="pointer-events-none absolute top-0 left-0 overflow-visible"
      width={size.width}
      height={size.height}
    >
      {arrows.map((a) => {
        const lit = focus !== null && isFocused(a);
        return (
          <g
            key={a.key}
            className="transition-opacity duration-200"
            opacity={focus === null ? 0.8 : lit ? 1 : 0.15}
          >
            <path
              d={a.line}
              pathLength={1}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={lit ? 2.25 : 1.5}
              strokeLinecap="round"
              className="mcv-arrow-draw transition-[stroke-width] duration-200"
            />
            <path d={a.head} fill="var(--primary)" className="mcv-arrow-head" />
          </g>
        );
      })}
    </svg>
  );
}
