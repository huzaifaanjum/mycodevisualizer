"use client";

import { MinusIcon, MousePointerClickIcon, PlusIcon, ScanIcon } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Trace } from "@/shared/trace";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildFlow, nextRunOf, traceTransitions, type FlowEdge, type FlowNode, type FlowNodeKind, type MethodFlow } from "../lib/flow-graph";

const ROW_H = 70;
const NODE_H = 42;
const NODE_W = 300;
const PAD_Y = 14;
const LANE = 16;
const GUTTER = 44;
const ZOOM = { min: 0.4, max: 1.6, step: 0.1 } as const;

/**
 * Flowchart of this run, one per method that ran, using standard flowchart symbols. Arrows are
 * the paths execution actually took with this input: thicker = taken more often, dashed = taken
 * later, faded symbols never ran. Click a symbol to jump to the next time it runs.
 */
export function FlowView({
  trace,
  sourceLines,
  index,
  onSeek,
}: {
  trace: Trace;
  sourceLines: string[];
  index: number;
  onSeek: (step: number) => void;
}) {
  const transitions = useMemo(() => traceTransitions(trace), [trace]);
  const flows = useMemo(() => buildFlow(trace, sourceLines, index, transitions), [trace, sourceLines, index, transitions]);
  const layouts = useMemo(() => new Map(flows.map((f) => [f.key, layoutFlow(f)])), [flows]);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.querySelector<HTMLElement>('[data-current="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [index, zoom]);

  if (flows.length === 0) return <p className="p-4 text-xs text-muted-foreground">Nothing ran yet.</p>;

  const shown = flows.filter((f) => !hidden.has(f.key));
  const fit = () => {
    const available = (scrollRef.current?.clientWidth ?? 600) - 32;
    const widest = Math.max(...shown.map((f) => layouts.get(f.key)?.width ?? NODE_W));
    setZoom(clampZoom(available / widest));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Methods to show">
          {flows.map((f) => {
            const on = !hidden.has(f.key);
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setHidden((h) => {
                    const next = new Set(h);
                    if (next.has(f.key)) next.delete(f.key);
                    else next.add(f.key);
                    return next;
                  })
                }
                className={cn(
                  "rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors",
                  on ? "border-primary/60 bg-primary/10 text-foreground" : "text-muted-foreground line-through",
                )}
              >
                {f.method}()
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-0.5" role="group" aria-label="Zoom">
          <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => setZoom((z) => clampZoom(z - ZOOM.step))}>
            <MinusIcon />
          </Button>
          <button type="button" className="w-12 text-center font-mono text-[11px] text-muted-foreground" onClick={() => setZoom(1)} title="Reset zoom">
            {Math.round(zoom * 100)}%
          </button>
          <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => setZoom((z) => clampZoom(z + ZOOM.step))}>
            <PlusIcon />
          </Button>
          <Button variant="ghost" size="sm" onClick={fit} className="text-xs">
            <ScanIcon /> Fit
          </Button>
        </div>
      </div>
      <Legend />
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto p-4">
        <div className="flex flex-col gap-8" style={{ zoom }}>
          {shown.map((flow) => {
            const layout = layouts.get(flow.key);
            return layout ? <MethodChart key={flow.key} flow={flow} layout={layout} index={index} onSeek={onSeek} /> : null;
          })}
        </div>
      </div>
    </div>
  );
}

const clampZoom = (z: number) => Math.round(Math.min(ZOOM.max, Math.max(ZOOM.min, z)) * 10) / 10;

// ---- layout ------------------------------------------------------------------------------------

interface Arc {
  edge: FlowEdge;
  i: number;
  j: number;
  side: "straight" | "left" | "right";
  level: number;
}

interface FlowLayout {
  arcs: Arc[];
  left: number;
  width: number;
  height: number;
}

/** Boxes in one column; nested arcs get their own lane so they never overlap. */
function layoutFlow(flow: MethodFlow): FlowLayout {
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
  const leftLanes = assign("left");
  const rightLanes = assign("right");
  const left = GUTTER + leftLanes * LANE;
  return {
    arcs,
    left,
    width: left + NODE_W + GUTTER + rightLanes * LANE,
    height: PAD_Y * 2 + (flow.nodes.length - 1) * ROW_H + NODE_H,
  };
}

const topOf = (i: number) => PAD_Y + i * ROW_H;

// ---- shapes ------------------------------------------------------------------------------------

/** SVG outline for each flowchart symbol, in a box of size w × h at the origin. */
function shapePath(kind: FlowNodeKind, w: number, h: number): string {
  switch (kind) {
    case "start":
    case "end":
      return `M ${h / 2} 0 H ${w - h / 2} A ${h / 2} ${h / 2} 0 0 1 ${w - h / 2} ${h} H ${h / 2} A ${h / 2} ${h / 2} 0 0 1 ${h / 2} 0 Z`;
    case "decision":
      return `M 0 ${h / 2} L ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} Z`;
    case "loop":
      return `M 0 ${h / 2} L ${h / 2} 0 H ${w - h / 2} L ${w} ${h / 2} L ${w - h / 2} ${h} H ${h / 2} Z`;
    case "io":
      return `M 14 0 H ${w} L ${w - 14} ${h} H 0 Z`;
    case "call":
    case "statement":
    case "return":
      return `M 6 0 H ${w - 6} Q ${w} 0 ${w} 6 V ${h - 6} Q ${w} ${h} ${w - 6} ${h} H 6 Q 0 ${h} 0 ${h - 6} V 6 Q 0 0 6 0 Z`;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

/** Horizontal room for text inside each symbol. */
const TEXT_INSET: Record<FlowNodeKind, number> = {
  start: 18,
  end: 18,
  decision: 64,
  loop: 26,
  io: 20,
  call: 16,
  statement: 10,
  return: 10,
};

const KIND_LABEL: Record<FlowNodeKind, string> = {
  start: "start",
  end: "end",
  decision: "decision",
  loop: "loop",
  io: "input / output",
  call: "calls a method",
  statement: "statement",
  return: "return",
};

function Legend() {
  const items: FlowNodeKind[] = ["start", "statement", "decision", "loop", "io", "call"];
  return (
    <details className="group border-b px-3 py-1.5 text-[11px] text-muted-foreground">
      <summary className="cursor-pointer select-none">How to read this flowchart</summary>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 pb-1">
        {items.map((kind) => (
          <span key={kind} className="flex items-center gap-1.5">
            <svg width={44} height={18} viewBox="0 0 88 36" aria-hidden>
              <path d={shapePath(kind, 88, 36)} fill="var(--card)" stroke="var(--muted-foreground)" strokeWidth={2} />
              {kind === "call" && <path d="M 9 0 V 36 M 79 0 V 36" stroke="var(--muted-foreground)" strokeWidth={2} />}
            </svg>
            {kind === "start" ? "start / end" : KIND_LABEL[kind]}
          </span>
        ))}
        <span>Arrows: thicker = taken more often · dashed = taken later · faded symbol = never ran with this input</span>
        <span className="flex items-center gap-1">
          <MousePointerClickIcon className="size-3" aria-hidden /> Click a symbol to jump to the next time it runs
        </span>
      </div>
    </details>
  );
}

// ---- chart -------------------------------------------------------------------------------------

function MethodChart({ flow, layout, index, onSeek }: { flow: MethodFlow; layout: FlowLayout; index: number; onSeek: (step: number) => void }) {
  const markerId = useId().replace(/:/g, "");
  const { arcs, left, width, height } = layout;
  const mid = left + NODE_W / 2;

  return (
    <section aria-label={`Flow of ${flow.method}`} className="w-fit">
      <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <code className="rounded-md border bg-card px-2 py-0.5 text-xs font-semibold">{flow.signature ?? `${flow.method}()`}</code>
        <span className="text-[11px] text-muted-foreground">
          {flow.method === "main" ? "program start" : `called ${flow.calls} of ${flow.totalCalls} time${flow.totalCalls === 1 ? "" : "s"}`}
        </span>
      </header>
      <div className="relative" style={{ width, height }}>
        <svg aria-hidden className="pointer-events-none absolute inset-0 overflow-visible" width={width} height={height}>
          <defs>
            {(["idle", "taken", "now"] as const).map((state) => (
              <marker key={state} id={`${markerId}-${state}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={state === "now" ? "var(--primary)" : state === "taken" ? "var(--muted-foreground)" : "var(--border)"} />
              </marker>
            ))}
          </defs>
          {arcs.map((arc) => {
            const g = arcGeometry(arc, left, mid);
            const isNow = flow.lastEdge?.from === arc.edge.from && flow.lastEdge.to === arc.edge.to;
            const taken = arc.edge.count > 0;
            const state = isNow ? "now" : taken ? "taken" : "idle";
            return (
              <path
                key={`${arc.edge.from}-${arc.edge.to}`}
                d={g.d}
                fill="none"
                stroke={isNow ? "var(--primary)" : taken ? "var(--muted-foreground)" : "var(--border)"}
                strokeWidth={taken ? Math.min(5, 1.4 + Math.log2(arc.edge.count + 1)) : 1.4}
                strokeDasharray={taken ? undefined : "5 5"}
                markerEnd={`url(#${markerId}-${state})`}
                opacity={taken ? 1 : 0.7}
                className={isNow ? "drop-shadow-[0_0_4px_var(--primary)]" : undefined}
              />
            );
          })}
          {flow.nodes.map((node, i) => (
            <NodeShape key={node.line} node={node} x={left} y={topOf(i)} isCurrent={flow.currentLine === node.line} />
          ))}
        </svg>

        {arcs.map((arc) => {
          const text = edgeText(arc.edge);
          if (!text) return null;
          const g = arcGeometry(arc, left, mid);
          const isNow = flow.lastEdge?.from === arc.edge.from && flow.lastEdge.to === arc.edge.to;
          return (
            <span
              key={`label-${arc.edge.from}-${arc.edge.to}`}
              className={cn(
                "pointer-events-none absolute -translate-y-1/2 rounded-full border bg-background px-1.5 font-mono text-[10px] leading-4 whitespace-nowrap",
                arc.side === "left" ? "-translate-x-full" : arc.side === "straight" ? "translate-x-2" : undefined,
                isNow ? "border-primary text-primary" : arc.edge.label === "true" ? "border-primary/40 text-primary/90" : arc.edge.label === "false" ? "border-danger/40 text-danger/90" : "text-muted-foreground",
                arc.edge.count === 0 && "opacity-60",
              )}
              style={{ left: g.lx, top: g.ly }}
            >
              {text}
            </span>
          );
        })}

        {flow.nodes.map((node, i) => (
          <NodeLabel
            key={node.line}
            node={node}
            x={left}
            y={topOf(i)}
            isCurrent={flow.currentLine === node.line}
            onJump={() => {
              const target = nextRunOf(node, index);
              if (target !== null) onSeek(target);
            }}
          />
        ))}
      </div>
    </section>
  );
}

function arcGeometry(arc: Arc, left: number, mid: number) {
  const y1 = topOf(arc.i);
  const y2 = topOf(arc.j);
  if (arc.side === "straight") {
    return { d: `M ${mid} ${y1 + NODE_H} L ${mid} ${y2}`, lx: mid, ly: (y1 + NODE_H + y2) / 2 };
  }
  const off = 14 + arc.level * LANE;
  const x = arc.side === "left" ? left : left + NODE_W;
  const out = arc.side === "left" ? x - off : x + off;
  const a = y1 + NODE_H / 2;
  const b = y2 + NODE_H / 2;
  // For diamonds and hexagons the side tips are at mid-height, so arcs attach exactly there.
  return { d: `M ${x} ${a} C ${out} ${a}, ${out} ${b}, ${x} ${b}`, lx: arc.side === "left" ? out - 2 : out + 4, ly: (a + b) / 2 };
}

function edgeText(edge: FlowEdge): string | null {
  const n = `×${edge.count}`;
  switch (edge.label) {
    case "true":
      return `true ${n}`;
    case "false":
      return `false ${n}`;
    case "repeat":
      return `repeat ${n}`;
    case "return":
      return `return ${n}`;
    case "enter":
      return edge.total > 1 ? n : null;
    default:
      return edge.total > 1 ? n : null;
  }
}

function NodeShape({ node, x, y, isCurrent }: { node: FlowNode; x: number; y: number; isCurrent: boolean }) {
  const neverRan = node.totalVisits === 0 && node.kind !== "end";
  const notYet = !neverRan && node.visits === 0;
  return (
    <g transform={`translate(${x} ${y})`} opacity={neverRan ? 0.35 : notYet ? 0.6 : 1}>
      <path
        d={shapePath(node.kind, NODE_W, NODE_H)}
        fill={isCurrent ? "color-mix(in oklab, var(--primary) 18%, var(--card))" : "var(--card)"}
        stroke={isCurrent ? "var(--primary)" : node.kind === "start" || node.kind === "end" ? "var(--muted-foreground)" : "var(--border)"}
        strokeWidth={isCurrent ? 2.5 : 1.5}
        strokeDasharray={neverRan ? "5 4" : undefined}
        className={isCurrent ? "drop-shadow-[0_0_6px_var(--primary)]" : undefined}
      />
      {node.kind === "call" && (
        <path d={`M 9 0 V ${NODE_H} M ${NODE_W - 9} 0 V ${NODE_H}`} stroke={isCurrent ? "var(--primary)" : "var(--border)"} strokeWidth={1.5} />
      )}
    </g>
  );
}

function NodeLabel({ node, x, y, isCurrent, onJump }: { node: FlowNode; x: number; y: number; isCurrent: boolean; onJump: () => void }) {
  const neverRan = node.totalVisits === 0 && node.kind !== "end";
  const isTerminal = node.kind === "start" || node.kind === "end";
  const inset = TEXT_INSET[node.kind];
  const text = isTerminal ? node.text : node.text.replace(/\s*\{\s*$/, "");
  const canJump = node.steps.length > 0;
  const runs = isTerminal ? null : `line ${node.line} · ran ${node.visits} of ${node.totalVisits} time${node.totalVisits === 1 ? "" : "s"}`;
  return (
    <>
      <button
        type="button"
        data-current={isCurrent ? "true" : undefined}
        disabled={!canJump}
        onClick={onJump}
        title={
          neverRan
            ? `Line ${node.line} never ran with this input`
            : `${runs ?? node.text}${canJump ? "\nClick to jump to the next time this runs" : ""}`
        }
        aria-label={`${KIND_LABEL[node.kind]}: ${text}${runs ? `, ${runs}` : ""}`}
        className={cn(
          "absolute flex items-center justify-center rounded-md font-mono text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
          canJump ? "cursor-pointer hover:text-primary" : "cursor-default",
          neverRan && "opacity-40",
          isTerminal && "font-sans font-semibold",
        )}
        style={{ left: x + inset, top: y, width: NODE_W - inset * 2, height: NODE_H }}
      >
        <span className="truncate">{text}</span>
      </button>
      {!isTerminal && (
        <span
          className={cn(
            "pointer-events-none absolute -translate-y-1/2 rounded-full border bg-background px-1.5 font-mono text-[10px] leading-4",
            isCurrent ? "border-primary text-primary" : "text-muted-foreground",
            neverRan && "border-dashed",
          )}
          style={{ left: x + NODE_W - 34, top: y }}
          aria-hidden
        >
          {neverRan ? "never" : `×${node.visits}`}
        </span>
      )}
      <span className="pointer-events-none absolute font-mono text-[9px] text-muted-foreground" style={{ left: x - 30, top: y + NODE_H / 2 - 6 }} aria-hidden>
        {isTerminal ? "" : node.line}
      </span>
      {node.calls.map((c, k) => (
        <span
          key={c.method}
          className="pointer-events-none absolute translate-y-1/2 rounded-full border border-primary/40 bg-background px-1.5 font-mono text-[10px] leading-4 text-primary/90"
          style={{ left: x + 18 + k * 110, top: y + NODE_H - 8 }}
          aria-hidden
        >
          → {c.method}() ×{c.count}
        </span>
      ))}
    </>
  );
}
