import { CornerDownLeftIcon, HourglassIcon, PlayIcon, SquareFunctionIcon } from "lucide-react";
import { InfoTip } from "@/components/common/info-tip";
import type { Frame, Heap, Value } from "@/shared/trace";
import { cn } from "@/lib/utils";
import { EXPLAIN } from "../lib/explanations";
import { formatValue } from "../lib/trace-helpers";
import { ValueText } from "./value-text";

export function FrameCard({
  frame,
  heap,
  isCurrent,
  explained = false,
  finished = false,
  changed,
  received,
  returning,
}: {
  frame: Frame;
  heap: Heap;
  isCurrent: boolean;
  /** Show the (i) and column labels; only the top frame does, so a deep stack stays uncluttered. */
  explained?: boolean;
  /** The program has ended, so no frame is running or waiting. */
  finished?: boolean;
  changed: Set<string>;
  /** This frame just got a value back from a method it called (shown until the next step). */
  received?: { method: string; value: Value; call?: string };
  /** This frame is leaving the stack and handing back this value. */
  returning?: Value;
}) {
  const locals = frame.locals.filter((l) => !(frame.method === "main" && l.name === "args"));
  return (
    <section
      aria-label={`${frame.method} frame`}
      aria-current={isCurrent ? "step" : undefined}
      data-frame
      className={cn(
        "mcv-push-in bg-card overflow-hidden rounded-lg border border-l-[3px] text-sm transition-[opacity,border-color,box-shadow] duration-300",
        isCurrent
          ? "border-primary/50 border-l-primary ring-primary/20 shadow-sm ring-1"
          : "border-l-border opacity-70",
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-2 border-b px-3 py-2 transition-colors duration-300",
          isCurrent ? "bg-primary/10" : "bg-muted/40",
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5 font-mono text-xs font-semibold">
          <SquareFunctionIcon
            className={cn("size-3.5 shrink-0", isCurrent ? "text-primary" : "text-muted-foreground")}
            aria-hidden
          />
          <span className="truncate">
            {frame.method}
            <span className="text-muted-foreground">()</span>
          </span>
          {explained && <InfoTip title={EXPLAIN.frame.title} text={EXPLAIN.frame.text} />}
          {returning ? (
            <span className="bg-changed/15 text-changed flex items-center gap-1 rounded-full px-1.5 py-px font-sans text-[10px] font-medium">
              <CornerDownLeftIcon className="size-2.5" aria-hidden />
              returns {formatValue(returning, heap)}
            </span>
          ) : finished ? null : isCurrent ? (
            <InfoTip
              title={EXPLAIN.running.title}
              text={EXPLAIN.running.text}
              className="bg-primary text-primary-foreground hover:text-primary-foreground rounded-full px-1.5 py-px font-sans text-[10px] font-medium"
              hideIcon
            >
              <PlayIcon className="size-2.5 fill-current" aria-hidden />
              running
            </InfoTip>
          ) : (
            <InfoTip
              title={EXPLAIN.waiting.title}
              text={EXPLAIN.waiting.text}
              className="rounded-full border px-1.5 py-px font-sans text-[10px] font-medium"
              hideIcon
            >
              <HourglassIcon className="size-2.5" aria-hidden />
              waiting
            </InfoTip>
          )}
        </span>
        <span key={frame.line} className="mcv-fade-in text-muted-foreground font-mono text-[11px]">
          line {frame.line}
        </span>
      </header>
      {received && (
        <div
          key={`${received.method}:${formatValue(received.value, heap)}`}
          className="mcv-pop-in bg-changed/10 flex items-center gap-2 border-b px-3 py-1.5 text-xs shadow-[inset_3px_0_0_var(--changed)]"
        >
          <CornerDownLeftIcon className="text-changed size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="font-mono font-medium">{received.call ?? `${received.method}()`}</span>
            <span className="text-muted-foreground"> returned </span>
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <ValueText value={received.value} heap={heap} sourceId={`${frame.id}:returned`} changed />
            <InfoTip title={EXPLAIN.returned.title} text={EXPLAIN.returned.text} />
          </span>
        </div>
      )}
      {locals.length === 0 ? (
        <p className="text-muted-foreground px-3 py-2.5 text-xs">No variables yet</p>
      ) : (
        <table className="w-full text-xs">
          {explained && (
            <thead>
              <tr className="border-border/60 text-muted-foreground border-b text-[10px]">
                <th className="py-1 pl-3 text-left font-normal">type</th>
                <th className="py-1 text-left font-normal">name</th>
                <th className="py-1 pr-3 text-right font-normal">
                  <span className="inline-flex items-center gap-1">
                    value
                    <InfoTip
                      title={EXPLAIN.variable.title}
                      text={EXPLAIN.variable.text}
                      className="[&>svg]:size-3"
                    />
                  </span>
                </th>
              </tr>
            </thead>
          )}
          <tbody>
            {locals.map((local) => {
              const key = `${frame.id}:${local.name}`;
              const isChanged = changed.has(key);
              return (
                <tr
                  key={local.name}
                  className={cn(
                    "border-border/60 border-b transition-colors duration-300 last:border-0",
                    isChanged && "bg-changed/10 shadow-[inset_3px_0_0_var(--changed)]",
                  )}
                >
                  <td className="text-muted-foreground w-0 py-1.5 pr-2 pl-3 font-mono text-[11px] whitespace-nowrap">
                    {local.type}
                  </td>
                  <td className="py-1.5 pr-2 font-mono font-medium">{local.name}</td>
                  <td className="py-1.5 pr-3 text-right">
                    <ValueText value={local.value} heap={heap} sourceId={key} changed={isChanged} />
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
