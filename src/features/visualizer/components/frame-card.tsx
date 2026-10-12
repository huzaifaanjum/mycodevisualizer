import type { Frame, Heap } from "@/shared/trace";
import { cn } from "@/lib/utils";
import { ValueText } from "./value-text";

export function FrameCard({
  frame,
  heap,
  isCurrent,
  changed,
}: {
  frame: Frame;
  heap: Heap;
  isCurrent: boolean;
  changed: Set<string>;
}) {
  const locals = frame.locals.filter((l) => !(frame.method === "main" && l.name === "args"));
  return (
    <section
      aria-label={`${frame.method} frame`}
      className={cn(
        "mcv-frame-in rounded-lg border bg-card text-sm",
        isCurrent ? "border-primary/60 ring-1 ring-primary/25" : "opacity-80",
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
        <span className="font-mono text-xs font-semibold">
          {frame.method}
          <span className="text-muted-foreground">()</span>
        </span>
        <span className="text-[11px] text-muted-foreground">line {frame.line}</span>
      </header>
      {locals.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">No variables yet</p>
      ) : (
        <table className="w-full text-xs">
          <tbody>
            {locals.map((local) => {
              const key = `${frame.id}:${local.name}`;
              return (
                <tr key={local.name} className="border-b border-border/60 last:border-0">
                  <td className="w-0 py-1 pr-2 pl-3 whitespace-nowrap text-muted-foreground">{local.type}</td>
                  <td className="py-1 pr-2 font-mono font-medium">{local.name}</td>
                  <td className="py-1 pr-3 text-right">
                    <ValueText value={local.value} heap={heap} sourceId={key} changed={changed.has(key)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
