import type { ReactNode } from "react";

/** The legend along the bottom of a diagram (memory, flow, call tree): one look for all of them. */
export function LegendStrip({ children }: { children: ReactNode }) {
  return (
    <ul
      aria-label="Legend"
      className="glass text-muted-foreground relative z-10 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-1.5 text-[11px]"
    >
      {children}
    </ul>
  );
}
