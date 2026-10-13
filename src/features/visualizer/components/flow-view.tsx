"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  CodeXmlIcon,
  CornerDownLeftIcon,
  LocateFixedIcon,
  MinusIcon,
  MousePointerClickIcon,
  PlayIcon,
  PlusIcon,
  RepeatIcon,
  SplitIcon,
  SquareFunctionIcon,
  SquareIcon,
  TerminalIcon,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Trace } from "@/shared/trace";
import { Button } from "@/components/ui/button";
import { CANVAS_TOOLBAR_CLASS, CanvasButton, DOT_GAP } from "@/components/common/pan-zoom-canvas";
import { Hint } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LegendStrip } from "./legend-strip";

/** Height kept clear at the top of the canvas for the floating controls. */
const TOOLBAR_CLEARANCE = 56;
/** How far above its place the chart starts when it first appears. */
const ENTRANCE_DROP_PX = 120;
import { cn } from "@/lib/utils";
import { isDarkTheme, useTheme } from "@/features/theme";
import { buildFlow, nextRunOf, traceTransitions, type FlowEdge, type FlowNode, type FlowNodeKind, type MethodFlow } from "../lib/flow-graph";

const NODE_W = 280;
const TERMINAL_W = 150;
const NODE_H = 52;
const ROW_H = 96;
const HEADER_H = 64;
const PAD = 28;
const LANE = 18;
const GUTTER = 36;
const COLUMN_GAP = 80;
const ZOOM = { min: 0.3, max: 1.6 } as const;

/**
 * Flowchart of this run, one column per method that ran, on a pannable canvas. Arrows are the
 * paths execution actually took with this input: thicker = taken more often, dashed = not taken
 * yet, faded cards never ran. Click a card to jump to the next time it runs.
 */
export function FlowView(props: {
  trace: Trace;
  sourceLines: string[];
  index: number;
  onSeek: (step: number) => void;
  /** Pixels on the left covered by a floating panel (full screen); the chart frames beside it. */
  insetLeft?: number;
}) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
}

function FlowCanvas({
  trace,
  sourceLines,
  index,
  onSeek,
  insetLeft = 0,
}: {
  trace: Trace;
  sourceLines: string[];
  index: number;
  onSeek: (step: number) => void;
  insetLeft?: number;
}) {
  const { theme } = useTheme();
  const transitions = useMemo(() => traceTransitions(trace), [trace]);
  const flows = useMemo(() => buildFlow(trace, sourceLines, index, transitions), [trace, sourceLines, index, transitions]);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const markerId = useId().replace(/:/g, "");
  const shown = useMemo(() => flows.filter((f) => !hidden.has(f.key)), [flows, hidden]);
  const graph = useMemo(() => buildGraph(shown, index, onSeek, markerId), [shown, index, onSeek, markerId]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setViewport, getViewport, zoomIn, zoomOut, zoomTo } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);

  const entered = useRef(false);
  // Hidden until first placed, so the chart never flashes at React Flow's default position.
  const [placed, setPlaced] = useState(false);
  /**
   * Centers the whole chart; tall charts are pinned to the top so the start is visible. The first
   * time, the chart drops in from above (top to bottom) instead of sliding in from the side.
   */
  const frame = useCallback(() => {
    const el = containerRef.current;
    if (!el || graph.width === 0) return;
    const w = el.clientWidth - insetLeft;
    // The floating controls cover the top of the canvas; the chart starts below them.
    const top = TOOLBAR_CLEARANCE;
    const h = el.clientHeight - top;
    // Fit the width always; fit the height only while the text stays readable.
    const fitW = (w - 48) / graph.width;
    const fitH = (h - 48) / graph.height;
    const z = Math.max(ZOOM.min, Math.min(1, fitW, Math.max(fitH, 0.75)));
    const x = insetLeft + (w - graph.width * z) / 2;
    const y = top + (graph.height * z <= h - 48 ? (h - graph.height * z) / 2 : 24);
    if (!entered.current) {
      entered.current = true;
      void setViewport({ x, y: y - ENTRANCE_DROP_PX, zoom: z });
      setPlaced(true);
      requestAnimationFrame(() => void setViewport({ x, y, zoom: z }, { duration: 450 }));
      return;
    }
    void setViewport({ x, y, zoom: z }, { duration: 200 });
  }, [graph.width, graph.height, setViewport, insetLeft]);

  const shownKey = shown.map((f) => f.key).join("|");
  useEffect(() => {
    const raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // Re-frame only when the set of methods changes, not on every step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownKey, insetLeft]);

  // Keep the current card on screen while stepping, without fighting the user's pan otherwise.
  useEffect(() => {
    const el = containerRef.current;
    const current = graph.nodes.find((n) => n.type === "card" && n.data.isCurrent);
    if (!el || !current) return;
    const { x, y, zoom } = getViewport();
    const cx = current.position.x + (current.width ?? NODE_W) / 2;
    const cy = current.position.y + NODE_H / 2;
    const sx = cx * zoom + x;
    const sy = cy * zoom + y;
    const margin = 40;
    if (sx < insetLeft + margin || sy < margin || sx > el.clientWidth - margin || sy > el.clientHeight - margin) {
      // Center it in the visible part of the canvas (beside any floating panel).
      const visibleCenterX = insetLeft + (el.clientWidth - insetLeft) / 2;
      void setViewport({ x: visibleCenterX - cx * zoom, y: el.clientHeight / 2 - cy * zoom, zoom }, { duration: 250 });
    }
  }, [index, graph.nodes, getViewport, setViewport, insetLeft]);

  if (flows.length === 0) return <p className="p-4 text-xs text-muted-foreground">Nothing ran yet.</p>;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* The flowchart's own controls float across the top of the canvas (beside the full-screen card). */}
      <div role="toolbar" aria-label="Flowchart controls" style={{ left: insetLeft + 12 }}
        className="glass absolute top-3 right-3 z-20 flex flex-wrap items-center rounded-xl border p-1.5 shadow-lg gap-2">
        {/* Method tabs, styled like the call tree's Tree / Outline switch. Several can be on at once;
            at least one always stays on. */}
        <ToggleGroup
          type="multiple"
          aria-label="Methods to show"
          value={flows.filter((f) => !hidden.has(f.key)).map((f) => f.key)}
          onValueChange={(on) => {
            if (on.length === 0) return;
            setHidden(new Set(flows.filter((f) => !on.includes(f.key)).map((f) => f.key)));
          }}
          className="flex-wrap"
        >
          {flows.map((f) => (
            <ToggleGroupItem key={f.key} value={f.key} aria-label={`${f.method}()`} className="font-mono">
              {f.method}()
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button variant="ghost" size="sm" onClick={frame} className="ml-auto text-xs">
          <LocateFixedIcon /> Center
        </Button>
      </div>
      <section
        ref={containerRef}
        aria-label="Flowchart"
        className={cn("relative min-h-0 flex-1 transition-opacity duration-300", placed ? "opacity-100" : "opacity-0")}
      >
        <svg aria-hidden className="absolute size-0">
          <defs>
            {(["idle", "taken", "now"] as const).map((state) => (
              <marker key={state} id={`${markerId}-${state}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_COLOR[state]} />
              </marker>
            ))}
          </defs>
        </svg>
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          colorMode={isDarkTheme(theme) ? "dark" : "light"}
          minZoom={ZOOM.min}
          maxZoom={ZOOM.max}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          panOnScroll
          attributionPosition="bottom-left"
          zoomOnDoubleClick={false}
          style={{ background: "var(--background)" }}
        >
          {/* Same dots as the other canvases: React Flow sizes dots by diameter and tints its own background in dark mode. */}
          <Background variant={BackgroundVariant.Dots} gap={DOT_GAP} size={2} color="var(--canvas-dot)" bgColor="var(--background)" />

        </ReactFlow>
        {/* Same glass controls (with tooltips) as the memory and call tree canvases. */}
        <div role="toolbar" aria-label="Canvas controls" className={CANVAS_TOOLBAR_CLASS}>
          <CanvasButton label="Zoom out (Ctrl/⌘ + scroll)" onClick={() => void zoomOut({ duration: 150 })}>
            <MinusIcon />
          </CanvasButton>
          <Hint content="Back to 100%">
            <button
              type="button"
              onClick={() => void zoomTo(1, { duration: 150 })}
              className="text-muted-foreground hover:text-foreground w-11 rounded-md text-center font-mono text-xs tabular-nums"
              aria-label={`Zoom ${Math.round(zoom * 100)}%. Reset to 100%`}
            >
              {Math.round(zoom * 100)}%
            </button>
          </Hint>
          <CanvasButton label="Zoom in (Ctrl/⌘ + scroll)" onClick={() => void zoomIn({ duration: 150 })}>
            <PlusIcon />
          </CanvasButton>
          <CanvasButton label="Recenter: back to the start" onClick={frame}>
            <LocateFixedIcon />
          </CanvasButton>
        </div>
      </section>
    </div>
  );
}

// ---- graph -------------------------------------------------------------------------------------

type Side = "straight" | "left" | "right";
type EdgeState = "idle" | "taken" | "now";

const EDGE_COLOR: Record<EdgeState, string> = {
  idle: "var(--input)",
  taken: "var(--muted-foreground)",
  now: "var(--primary)",
};

type CardData = { node: FlowNode; isCurrent: boolean; onJump: () => void };
type FrameData = { flow: MethodFlow };
type ArcData = { edge: FlowEdge; side: Side; out: number; state: EdgeState; marker: string };

type CardNode = Node<CardData, "card">;
type FrameNode = Node<FrameData, "frame">;
type FlowCanvasNode = CardNode | FrameNode;
type ArcEdge = Edge<ArcData, "arc">;

interface Arc {
  edge: FlowEdge;
  i: number;
  j: number;
  side: Side;
  level: number;
}

/** Nested side arcs get their own lane so they never overlap. */
function arcsOf(flow: MethodFlow) {
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
  return { arcs, lanes: Math.max(assign("left"), assign("right")) };
}

/** One centered column per method, side by side, each inside a frame. */
function buildGraph(flows: MethodFlow[], index: number, onSeek: (step: number) => void, markerId: string) {
  const nodes: FlowCanvasNode[] = [];
  const edges: ArcEdge[] = [];
  let x0 = 0;
  let maxH = 0;

  for (const flow of flows) {
    const { arcs, lanes } = arcsOf(flow);
    const half = NODE_W / 2 + GUTTER + lanes * LANE;
    const width = half * 2;
    const height = HEADER_H + (flow.nodes.length - 1) * ROW_H + NODE_H + PAD;
    const center = x0 + half;
    maxH = Math.max(maxH, height);

    nodes.push({
      id: `${flow.key}:frame`,
      type: "frame",
      position: { x: x0, y: 0 },
      width,
      height,
      zIndex: -1,
      data: { flow },
    });

    flow.nodes.forEach((node, i) => {
      const w = isTerminal(node.kind) ? TERMINAL_W : NODE_W;
      nodes.push({
        id: `${flow.key}:${node.line}`,
        type: "card",
        position: { x: center - w / 2, y: HEADER_H + i * ROW_H },
        width: w,
        height: NODE_H,
        data: {
          node,
          isCurrent: flow.currentLine === node.line,
          onJump: () => {
            const target = nextRunOf(node, index);
            if (target !== null) onSeek(target);
          },
        },
      });
    });

    for (const arc of arcs) {
      const isNow = flow.lastEdge?.from === arc.edge.from && flow.lastEdge.to === arc.edge.to;
      const state: EdgeState = isNow ? "now" : arc.edge.count > 0 ? "taken" : "idle";
      const off = NODE_W / 2 + 14 + arc.level * LANE;
      edges.push({
        id: `${flow.key}:${arc.edge.from}-${arc.edge.to}`,
        type: "arc",
        source: `${flow.key}:${arc.edge.from}`,
        target: `${flow.key}:${arc.edge.to}`,
        sourceHandle: arc.side === "straight" ? "bottom" : `${arc.side}-out`,
        targetHandle: arc.side === "straight" ? "top" : `${arc.side}-in`,
        zIndex: isNow ? 1 : 0,
        data: { edge: arc.edge, side: arc.side, out: arc.side === "left" ? center - off : center + off, state, marker: `url(#${markerId}-${state})` },
      });
    }
    x0 += width + COLUMN_GAP;
  }
  return { nodes, edges, width: Math.max(0, x0 - COLUMN_GAP), height: maxH };
}

const isTerminal = (kind: FlowNodeKind) => kind === "start" || kind === "end";

// ---- nodes -------------------------------------------------------------------------------------

const KIND: Record<FlowNodeKind, { label: string; icon: LucideIcon; color: string }> = {
  start: { label: "start", icon: PlayIcon, color: "var(--primary)" },
  end: { label: "end", icon: SquareIcon, color: "var(--muted-foreground)" },
  statement: { label: "statement", icon: CodeXmlIcon, color: "var(--muted-foreground)" },
  decision: { label: "decision", icon: SplitIcon, color: "var(--changed)" },
  loop: { label: "loop", icon: RepeatIcon, color: "var(--stdin)" },
  io: { label: "input / output", icon: TerminalIcon, color: "var(--foreground)" },
  call: { label: "calls a method", icon: SquareFunctionIcon, color: "var(--primary)" },
  return: { label: "return", icon: CornerDownLeftIcon, color: "var(--returned)" },
};

const HANDLE = "!size-1.5 !min-h-0 !min-w-0 !border-0 !bg-muted-foreground/50";

function Handles() {
  return (
    <>
      <Handle type="target" id="top" position={Position.Top} isConnectable={false} className={HANDLE} />
      <Handle type="source" id="bottom" position={Position.Bottom} isConnectable={false} className={HANDLE} />
      <Handle type="source" id="left-out" position={Position.Left} isConnectable={false} className="!opacity-0" />
      <Handle type="target" id="left-in" position={Position.Left} isConnectable={false} className="!opacity-0" />
      <Handle type="source" id="right-out" position={Position.Right} isConnectable={false} className="!opacity-0" />
      <Handle type="target" id="right-in" position={Position.Right} isConnectable={false} className="!opacity-0" />
    </>
  );
}

function CardNodeView({ data }: NodeProps<CardNode>) {
  const { node, isCurrent, onJump } = data;
  const kind = KIND[node.kind];
  const Icon = kind.icon;
  const terminal = isTerminal(node.kind);
  const neverRan = node.totalVisits === 0 && node.kind !== "end";
  const notYet = !neverRan && node.visits === 0;
  const text = terminal ? node.text : node.text.replace(/\s*\{\s*$/, "");
  const canJump = node.steps.length > 0;
  const runs = terminal ? null : `line ${node.line} · ran ${node.visits} of ${node.totalVisits} time${node.totalVisits === 1 ? "" : "s"}`;

  return (
    <div className={cn("relative size-full", neverRan ? "opacity-40" : notYet && "opacity-65")}>
      <Handles />
      <button
        type="button"
        data-current={isCurrent ? "true" : undefined}
        disabled={!canJump}
        onClick={onJump}
        title={neverRan ? `Line ${node.line} never ran with this input` : `${runs ?? node.text}${canJump ? "\nClick to jump to the next time this runs" : ""}`}
        aria-label={`${kind.label}: ${text}${runs ? `, ${runs}` : ""}`}
        className={cn(
          "nodrag nopan flex size-full items-center gap-2.5 border bg-card px-2 text-left shadow-md shadow-black/10 dark:shadow-black/40 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          terminal ? "justify-center rounded-full" : "rounded-xl",
          canJump ? "cursor-pointer hover:border-muted-foreground" : "cursor-default",
          neverRan && "border-dashed",
          isCurrent && "border-primary bg-[color-mix(in_oklab,var(--primary)_14%,var(--card))] shadow-[0_0_14px_-2px_var(--primary)] hover:border-primary",
        )}
      >
        <span
          className={cn("grid shrink-0 place-items-center", terminal ? "size-6 rounded-full" : "size-8 rounded-lg")}
          style={{ background: `color-mix(in oklab, ${kind.color} 18%, transparent)`, color: kind.color }}
        >
          <Icon className={terminal ? "size-3" : "size-4"} aria-hidden />
        </span>
        {terminal ? (
          <span className="text-xs font-semibold">{text}</span>
        ) : (
          <span className="min-w-0 flex-1">
            <span className="block truncate font-mono text-[11px] text-foreground">{text}</span>
            <span className="block text-[10px] text-muted-foreground">
              line {node.line} · {kind.label}
            </span>
          </span>
        )}
      </button>
      {!terminal && (
        <span
          className={cn(
            "pointer-events-none absolute -top-2 right-3 rounded-full border bg-background px-1.5 font-mono text-[10px] leading-4",
            isCurrent ? "border-primary text-primary" : "text-muted-foreground",
            neverRan && "border-dashed",
          )}
          aria-hidden
        >
          {neverRan ? "never" : `×${node.visits}`}
        </span>
      )}
      {node.calls.length > 0 && (
        <span className="pointer-events-none absolute top-full left-3 flex -translate-y-1/2 gap-1" aria-hidden>
          {node.calls.map((c) => (
            <span key={c.method} className="rounded-full border border-primary/40 bg-background px-1.5 font-mono text-[10px] leading-4 text-primary/90">
              → {c.method}() ×{c.count}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

function FrameNodeView({ data }: NodeProps<FrameNode>) {
  const { flow } = data;
  return (
    <section aria-label={`Flow of ${flow.method}`} className="glass pointer-events-none size-full rounded-2xl border border-dashed">
      <header className="flex flex-col items-center gap-1 px-3 pt-3 text-center">
        <code className="max-w-full truncate rounded-md border bg-card px-2 py-0.5 text-xs font-semibold">{flow.signature ?? `${flow.method}()`}</code>
        <span className="text-[11px] text-muted-foreground">
          {flow.method === "main" ? "program start" : `called ${flow.calls} of ${flow.totalCalls} time${flow.totalCalls === 1 ? "" : "s"}`}
        </span>
      </header>
    </section>
  );
}

const nodeTypes = { card: CardNodeView, frame: FrameNodeView };

// ---- edges -------------------------------------------------------------------------------------

function ArcEdgeView({ sourceX, sourceY, targetX, targetY, data }: EdgeProps<ArcEdge>) {
  if (!data) return null;
  const { edge, side, out, state, marker } = data;
  const taken = edge.count > 0;
  const d =
    side === "straight"
      ? `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
      : `M ${sourceX} ${sourceY} C ${out} ${sourceY}, ${out} ${targetY}, ${targetX} ${targetY}`;
  const lx = side === "straight" ? sourceX : out;
  const ly = (sourceY + targetY) / 2;
  const text = edgeText(edge);

  return (
    <>
      <BaseEdge
        path={d}
        markerEnd={marker}
        style={{
          stroke: EDGE_COLOR[state],
          strokeWidth: taken ? Math.min(5, 1.4 + Math.log2(edge.count + 1)) : 1.4,
          strokeDasharray: taken ? undefined : "5 5",
          filter: state === "now" ? "drop-shadow(0 0 4px var(--primary))" : undefined,
        }}
      />
      {text && (
        <EdgeLabelRenderer>
          <span
            className={cn(
              "pointer-events-none absolute rounded-full border bg-background px-1.5 font-mono text-[10px] leading-4 whitespace-nowrap",
              state === "now"
                ? "border-primary text-primary"
                : edge.label === "true"
                  ? "border-primary/40 text-primary/90"
                  : edge.label === "false"
                    ? "border-danger/40 text-danger/90"
                    : "text-muted-foreground",
              !taken && "opacity-60",
            )}
            style={{
              transform: `translate(${side === "left" ? "-100%" : side === "straight" ? "8px" : "4px"}, -50%) translate(${lx}px, ${ly}px)`,
              ...(side === "left" ? { marginLeft: -2 } : null),
            }}
          >
            {text}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes = { arc: ArcEdgeView };

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
    case undefined:
      return edge.total > 1 ? n : null;
    default: {
      const exhaustive: never = edge.label;
      return exhaustive;
    }
  }
}

// ---- legend ------------------------------------------------------------------------------------

/** How to read the flowchart, shown along the bottom like the other diagrams' legends. */
export function FlowLegend() {
  const items: FlowNodeKind[] = ["start", "statement", "decision", "loop", "io", "call", "return"];
  return (
    <LegendStrip>
      {items.map((k) => {
        const { icon: Icon, color, label } = KIND[k];
        return (
          <li key={k} className="flex items-center gap-1.5">
            <span
              className="grid size-5 place-items-center rounded-md"
              style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}
            >
              <Icon className="size-3" aria-hidden />
            </span>
            {k === "start" ? "start / end" : label}
          </li>
        );
      })}
      <li>Arrows: thicker = taken more often · dashed = not taken yet · faded card = never ran with this input</li>
      <li className="flex items-center gap-1">
        <MousePointerClickIcon className="size-3" aria-hidden /> Click a card to jump to the next time it runs
      </li>
    </LegendStrip>
  );
}
