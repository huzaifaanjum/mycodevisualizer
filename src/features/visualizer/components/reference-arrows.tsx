"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

interface Arrow {
  key: string;
  d: string;
}

/**
 * Draws SVG arrows from every [data-ref-source] dot to the [data-heap-id] box it points to.
 * Positions are measured from the DOM so layout stays plain HTML/CSS.
 */
export function ReferenceArrows({ containerRef, deps }: { containerRef: RefObject<HTMLElement | null>; deps: unknown }) {
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const base = container.getBoundingClientRect();
      const next: Arrow[] = [];
      container.querySelectorAll<HTMLElement>("[data-ref-source]").forEach((source) => {
        const targetId = source.dataset.refTarget;
        if (!targetId) return;
        const target = container.querySelector<HTMLElement>(`[data-heap-id="${CSS.escape(targetId)}"]`);
        if (!target) return;
        const s = source.getBoundingClientRect();
        const t = target.getBoundingClientRect();
        const sx = s.left + s.width / 2 - base.left + container.scrollLeft;
        const sy = s.top + s.height / 2 - base.top + container.scrollTop;
        const pointsRight = t.left >= s.right;
        const tx = (pointsRight ? t.left - 3 : t.right + 3) - base.left + container.scrollLeft;
        const ty = t.top + Math.min(14, t.height / 2) - base.top + container.scrollTop;
        const bend = Math.max(30, Math.abs(tx - sx) / 2);
        const c1 = pointsRight ? sx + bend : sx - bend;
        const c2 = pointsRight ? tx - bend : tx + bend;
        next.push({ key: source.dataset.refSource ?? `${sx}-${sy}`, d: `M ${sx} ${sy} C ${c1} ${sy}, ${c2} ${ty}, ${tx} ${ty}` });
      });
      setArrows(next);
      setSize({ width: container.scrollWidth, height: container.scrollHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, deps]);

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute top-0 left-0 overflow-visible"
      width={size.width}
      height={size.height}
    >
      <defs>
        <marker id="mcv-arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" />
        </marker>
      </defs>
      {arrows.map((a) => (
        <path key={a.key} d={a.d} fill="none" stroke="var(--primary)" strokeWidth={1.5} strokeOpacity={0.85} markerEnd="url(#mcv-arrowhead)" />
      ))}
    </svg>
  );
}
