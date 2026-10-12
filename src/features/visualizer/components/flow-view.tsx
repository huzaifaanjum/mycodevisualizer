"use client";

import { CornerUpLeftIcon, GitBranchIcon, type LucideIcon, PhoneOutgoingIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useId, useMemo, useRef } from "react";
import type { Trace } from "@/shared/trace";
import { cn } from "@/lib/utils";
import { buildFlow, traceTransitions, type FlowEdge, type FlowNode, type MethodFlow } from "../lib/flow-graph";

const ROW_H = 52;
const NODE_H = 36;
const NODE_W = 330;
const PAD_Y = 8;
const LANE = 14;
const GUTTER_MIN = 30;

const KIND_ICON: Partial<Record<FlowNode["kind"], LucideIcon>> = {
  decision: GitBranchIcon,
  loop: RefreshCwIcon,
  return: CornerUpLeftIcon,
};

/**
 * Flowchart of this run: one section per method that ran. Lines are boxes in source order; arrows
 * are the paths execution actually took with this input, thicker the more often they were taken.
 */
export function FlowView({ trace, sourceLines, index }: { trace: Trace; sourceLines: string[]; index: number }) {
  const transitions = useMemo(() => traceTransitions(trace), [trace]);
  const flows = useMemo(() => buildFlow(trace, sourceLines, index, transitions), [trace, sourceLines, index, transitions]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const current = containerRef.current?.querySelector<HTMLElement>('[data-current="true"]');
    current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [index]);

  if (flows.length === 0) return <p className="p-4 text-xs text-muted-foreground">Nothing ran yet.</p>;

  return (
    <div ref={containerRef} className="h-full overflow-auto p-3">
      <p className="mb-3 text-[11px] text-muted-foreground">
        The path this run took with your input. Thicker arrows were taken more often; dashed ones are taken later; faded boxes
        never ran.
      </p>
      <div className="flex flex-col gap-6">
        {flows.map((flow) => (
          <MethodSection key={flow.key} flow={flow} />
        ))}
      </div>
    </div>
  );
}

interface Arc {
  edge: FlowEdge;
  i: number;
  j: number;
  side: "straight" | "left" | "right";
  level: number;
}

/** Nested arcs get their own lane so they don't overlap: inner (shorter) spans hug the boxes. */
function layoutArcs(flow: MethodFlow): { arcs: Arc[]; leftLanes: number; rightLanes: number } {
  const row = new Map(flow.nodes.map((n, i) => [n.line, i]));
  const arcs: Arc[] = [];
  for (const edge of flow.edges) {
    const i = row.get(edge.from);
    const j = row.get(edge.to);
    if (i === undefined || j === undefined || i === j) continue;
    arcs.push({ edge, i, j, side: j === i + 1 ? "straight" : j > i ? "left" : "right", level: 0 });
  }
  const assign = (side: "left" | "right") => {
    const list = arcs.filter((a) => a.side === side).sort((a, b) => Math.abs(a.j - a.i) - Math.abs(b.j - b.i));
    for (const arc of list) {
      const [lo, hi] = [Math.min(arc.i, arc.j), Math.max(arc.i, arc.j)];
      const inner = list.filter((o) => o !== arc && o.level > 0 && Math.min(o.i, o.j) >= lo && Math.max(o.i, o.j) <= hi);
      arc.level = 1 + Math.max(0, ...inner.map((o) => o.level));
    }
    return Math.max(0, ...list.map((a) => a.level));
  };
  return { arcs, leftLanes: assign("left"), rightLanes: assign("right") };
}

function MethodSection({ flow }: { flow: MethodFlow }) {
  const markerId = useId().replace(/:/g, "");
  const { arcs, leftLanes, rightLanes } = useMemo(() => layoutArcs(flow), [flow]);
  const left = GUTTER_MIN + leftLanes * LANE;
  const right = GUTTER_MIN + rightLanes * LANE;
  const width = left + NODE_W + right;
  const height = PAD_Y * 2 + flow.nodes.length * ROW_H - (ROW_H - NODE_H);
  const top = (i: number) => PAD_Y + i * ROW_H;

  return (
    <section aria-label={`Flow of ${flow.method}`}>
      <header className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <code className="rounded-md border bg-card px-2 py-0.5 text-xs font-semibold">{flow.signature ?? `${flow.method}()`}</code>
        <span className="text-[11px] text-muted-foreground">
          {flow.method === "main"
            ? "program start"
            : `called ${flow.calls} of ${flow.totalCalls} time${flow.totalCalls === 1 ? "" : "s"}`}
        </span>
      </header>
      <div className="relative" style={{ width, height }}>
        <svg aria-hidden className="pointer-events-none absolute inset-0 overflow-visible" width={width} height={height}>
          <defs>
            {(["idle", "taken", "now"] as const).map((state) => (
              <marker
                key={state}
                id={`${markerId}-${state}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 0 L 10 5 L 0 10 z"
                  fill={state === "now" ? "var(--primary)" : state === "taken" ? "var(--muted-foreground)" : "var(--border)"}
                />
              </marker>
            ))}
          </defs>
          {arcs.map((arc) => {
            const { edge } = arc;
            const isNow = flow.lastEdge?.from === edge.from && flow.lastEdge.to === edge.to;
            const taken = edge.count > 0;
            const state = isNow ? "now" : taken ? "taken" : "idle";
            const stroke = isNow ? "var(--primary)" : taken ? "var(--muted-foreground)" : "var(--border)";
            const strokeWidth = taken ? Math.min(5, 1.25 + Math.log2(edge.count + 1)) : 1.25;
            const y1 = top(arc.i);
            const y2 = top(arc.j);
            const mid = left + NODE_W / 2;
            let d: string;
            let lx: number;
            let ly: number;
            if (arc.side === "straight") {
              d = `M ${mid} ${y1 + NODE_H} L ${mid} ${y2}`;
              lx = mid + 8;
              ly = (y1 + NODE_H + y2) / 2 + 3;
            } else {
              const off = 12 + arc.level * LANE;
              const x = arc.side === "left" ? left : left + NODE_W;
              const out = arc.side === "left" ? x - off : x + off;
              const a = y1 + NODE_H / 2;
              const b = y2 + NODE_H / 2;
              d = `M ${x} ${a} C ${out} ${a}, ${out} ${b}, ${x} ${b}`;
              lx = arc.side === "left" ? out - 4 : out + 4;
              ly = (a + b) / 2;
            }
            const label = edge.label === "true" ? "T" : edge.label === "false" ? "F" : null;
            return (
              <g key={`${edge.from}-${edge.to}`} opacity={taken ? 1 : 0.6}>
                <path
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeDasharray={taken ? undefined : "4 4"}
                  markerEnd={`url(#${markerId}-${state})`}
                  className={isNow ? "drop-shadow-[0_0_4px_var(--primary)]" : undefined}
                />
                <text
                  x={lx}
                  y={ly}
                  fontSize={10}
                  textAnchor={arc.side === "left" ? "end" : "start"}
                  fill={isNow ? "var(--primary)" : "var(--muted-foreground)"}
                  className="font-mono"
                >
                  {label && `${label} `}×{edge.count}
                </text>
              </g>
            );
          })}
        </svg>
        {flow.nodes.map((node, i) => (
          <FlowBox key={node.line} node={node} top={top(i)} left={left} isCurrent={flow.currentLine === node.line} />
        ))}
      </div>
    </section>
  );
}

function FlowBox({ node, top, left, isCurrent }: { node: FlowNode; top: number; left: number; isCurrent: boolean }) {
  const Icon = KIND_ICON[node.kind];
  const neverRan = node.totalVisits === 0;
  const notYet = !neverRan && node.visits === 0;
  return (
    <div
      data-current={isCurrent ? "true" : undefined}
      title={neverRan ? "This line never ran with this input" : `Line ${node.line} ran ${node.visits} of ${node.totalVisits} time(s) so far`}
      className={cn(
        "absolute flex items-center gap-2 rounded-md border bg-card px-2 text-xs transition-colors",
        node.kind === "decision" || node.kind === "loop" ? "rounded-l-2xl" : undefined,
        isCurrent && "border-primary bg-primary/15 ring-1 ring-primary",
        neverRan && "border-dashed bg-transparent opacity-40",
        notYet && "opacity-60",
      )}
      style={{ top, left, width: NODE_W, height: NODE_H }}
    >
      <span className="w-6 shrink-0 text-right font-mono text-[10px] text-muted-foreground">{node.line}</span>
      {Icon ? (
        <Icon className={cn("size-3.5 shrink-0", isCurrent ? "text-primary" : "text-muted-foreground")} aria-label={node.kind} />
      ) : null}
      <code className="min-w-0 flex-1 truncate">{node.text}</code>
      {node.calls.map((c) => (
        <span
          key={c.method}
          className="flex shrink-0 items-center gap-0.5 rounded bg-secondary px-1 font-mono text-[10px] text-muted-foreground"
          title={`Calls ${c.method}() — ${c.count} of ${c.total} time(s) so far`}
        >
          <PhoneOutgoingIcon className="size-2.5" aria-hidden />
          {c.method} ×{c.count}
        </span>
      ))}
      <span
        className={cn("shrink-0 font-mono text-[10px] tabular-nums", isCurrent ? "text-primary" : "text-muted-foreground")}
        aria-label={`ran ${node.visits} times`}
      >
        ×{node.visits}
      </span>
    </div>
  );
}
