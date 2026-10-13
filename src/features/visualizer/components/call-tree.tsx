"use client";

import { CircleAlertIcon, CornerDownRightIcon, EyeIcon, EyeOffIcon, ListTreeIcon, NetworkIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Trace } from "@/shared/trace";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildCallTimeline, callStatus, type CallRecord, type CallStatus, type CallTimeline } from "../lib/call-timeline";

const NODE_W = 176;
const NODE_H = 62;
const GAP_X = 18;
const GAP_Y = 46;
const PAD = 12;

type Layout = "tree" | "outline";

/**
 * Every method call in this run as a tree: who called whom, with which arguments, what came back,
 * and which steps each call covers. Click a call to jump to the step where it starts.
 */
export function CallTree({
  trace,
  index,
  onSeek,
  zoom = 100,
}: {
  trace: Trace;
  index: number;
  onSeek: (step: number) => void;
  /** Content zoom in percent. */
  zoom?: number;
}) {
  const timeline = useMemo(() => buildCallTimeline(trace), [trace]);
  const [layout, setLayout] = useState<Layout>("tree");
  const [showFuture, setShowFuture] = useState(false);
  const step = trace.steps[index];
  const currentId = step && step.event !== "end" ? (step.frames.at(-1)?.id ?? null) : null;
  const statuses = useMemo(() => {
    const map = new Map<string, CallStatus>();
    timeline.calls.forEach((c) => map.set(c.id, callStatus(c, index, currentId)));
    return map;
  }, [timeline, index, currentId]);
  const visible = (id: string) => showFuture || statuses.get(id) !== "future";
  const started = [...statuses.values()].filter((s) => s !== "future").length;
  const depthNow = step && step.event !== "end" ? step.frames.length : 0;

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    containerRef.current
      ?.querySelector<HTMLElement>('[data-status="current"], [data-status="threw"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [index, layout]);

  if (timeline.calls.size === 0) return <p className="p-4 text-xs text-muted-foreground">No calls yet.</p>;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-3 py-2">
        <ToggleGroup type="single" value={layout} onValueChange={(v) => (v === "tree" || v === "outline") && setLayout(v)} aria-label="Call tree layout">
          <ToggleGroupItem value="tree" aria-label="Tree diagram">
            <NetworkIcon aria-hidden /> Tree
          </ToggleGroupItem>
          <ToggleGroupItem value="outline" aria-label="Outline">
            <ListTreeIcon aria-hidden /> Outline
          </ToggleGroupItem>
        </ToggleGroup>
        <Button variant="ghost" size="sm" aria-pressed={showFuture} onClick={() => setShowFuture((v) => !v)} className="text-xs">
          {showFuture ? <EyeIcon /> : <EyeOffIcon />} {showFuture ? "Showing upcoming calls" : "Show upcoming calls"}
        </Button>
        <dl className="ml-auto flex gap-4 text-[11px] text-muted-foreground">
          <Stat label="calls so far" value={`${started} / ${timeline.calls.size}`} />
          <Stat label="stack depth now" value={String(depthNow)} />
          <Stat label="deepest" value={String(timeline.maxDepth + 1)} />
        </dl>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 overflow-auto">
        <div className="w-fit min-w-full" style={{ zoom: zoom / 100 }}>
          {layout === "tree" ? (
            <TreeDiagram timeline={timeline} statuses={statuses} visible={visible} onSeek={onSeek} />
          ) : (
            <ul role="tree" aria-label="Call outline" className="p-3 font-mono text-xs">
              {timeline.roots.filter(visible).map((id) => (
                <OutlineNode key={id} id={id} timeline={timeline} statuses={statuses} visible={visible} onSeek={onSeek} />
              ))}
            </ul>
          )}
        </div>
      </div>
      <Legend />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <dd className="font-mono text-xs text-foreground tabular-nums">{value}</dd>
      <dt>{label}</dt>
    </div>
  );
}

function Legend() {
  const items: [string, string][] = [
    ["border-primary bg-primary/15", "running now"],
    ["border-primary/60", "waiting for a call to return"],
    ["border-border", "finished"],
    ["border-dashed border-border opacity-50", "not called yet"],
    ["border-danger bg-danger/10", "crashed"],
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 border-t px-3 py-1.5 text-[10px] text-muted-foreground">
      {items.map(([cls, label]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={cn("inline-block h-2.5 w-4 rounded-sm border", cls)} aria-hidden />
          {label}
        </span>
      ))}
      <span>Click a call to jump to it · double-click to jump to its return</span>
    </div>
  );
}

const STATUS_CLASS: Record<CallStatus, string> = {
  current: "border-primary bg-primary/15 ring-2 ring-primary/40",
  active: "border-primary/60",
  returned: "border-border",
  future: "border-dashed border-border opacity-45",
  threw: "border-danger bg-danger/10 ring-2 ring-danger/30",
};

const STATUS_TEXT: Record<CallStatus, string> = {
  current: "running now",
  active: "waiting",
  returned: "finished",
  future: "not called yet",
  threw: "crashed",
};

function callLabel(c: CallRecord) {
  return `${c.method}(${c.args.map((a) => `${a.name} = ${a.value}`).join(", ")})`;
}

function stepRange(c: CallRecord) {
  return c.endStep === null ? `steps ${c.startStep + 1}–…` : `steps ${c.startStep + 1}–${c.endStep + 1}`;
}

function CallCard({
  call,
  status,
  onSeek,
  style,
}: {
  call: CallRecord;
  status: CallStatus;
  onSeek: (step: number) => void;
  style?: React.CSSProperties;
}) {
  const result =
    status === "threw" || (call.threw !== null && status !== "future")
      ? { text: `threw ${call.threw}`, cls: "text-danger" }
      : status === "returned"
        ? call.returnValue !== null
          ? { text: `→ ${call.returnValue}`, cls: "text-primary" }
          : { text: "→ done", cls: "text-muted-foreground" }
        : status === "future"
          ? { text: "upcoming", cls: "text-muted-foreground" }
          : { text: status === "current" ? "running…" : "waiting…", cls: "text-muted-foreground" };
  return (
    <button
      type="button"
      data-status={status}
      onClick={() => onSeek(call.startStep)}
      onDoubleClick={() => call.endStep !== null && onSeek(call.endStep)}
      title={`Call #${call.order}: ${callLabel(call)} · ${STATUS_TEXT[status]} · ${stepRange(call)}\nClick: jump to the call · double-click: jump to its return`}
      aria-label={`Call ${call.order}: ${callLabel(call)}, ${STATUS_TEXT[status]}${result.text ? `, ${result.text}` : ""}`}
      className={cn(
        "flex flex-col justify-center gap-0.5 rounded-lg border bg-card px-2.5 py-1.5 text-left font-mono text-[11px] transition-colors hover:border-foreground/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        STATUS_CLASS[status],
      )}
      style={style}
    >
      <span className="flex items-baseline gap-1.5">
        <span className="text-[10px] text-muted-foreground">#{call.order}</span>
        <span className="truncate font-semibold">
          {call.method}
          <span className="font-normal text-muted-foreground">({call.args.map((a) => `${a.name} = ${a.value}`).join(", ")})</span>
        </span>
      </span>
      <span className="flex items-center justify-between gap-2">
        <span className={cn("flex min-w-0 items-center gap-1 truncate", result.cls)}>
          {status === "threw" && <CircleAlertIcon className="size-3 shrink-0" aria-hidden />}
          {result.text}
        </span>
        <span className="shrink-0 text-[10px] text-muted-foreground">{stepRange(call)}</span>
      </span>
    </button>
  );
}

/** Classic tidy layout: leaves take consecutive slots, parents sit centred above their children. */
function layoutTree(timeline: CallTimeline, visible: (id: string) => boolean) {
  const pos = new Map<string, { x: number; y: number }>();
  let slot = 0;
  const place = (id: string): number => {
    const call = timeline.calls.get(id);
    if (!call) return 0;
    const kids = call.children.filter(visible);
    let x: number;
    if (kids.length === 0) {
      x = slot++ * (NODE_W + GAP_X);
    } else {
      const xs = kids.map(place);
      x = ((xs[0] ?? 0) + (xs.at(-1) ?? 0)) / 2;
    }
    pos.set(id, { x: PAD + x, y: PAD + call.depth * (NODE_H + GAP_Y) });
    return x;
  };
  timeline.roots.filter(visible).forEach(place);
  const width = PAD * 2 + Math.max(1, slot) * (NODE_W + GAP_X) - GAP_X;
  const height = PAD * 2 + (Math.max(0, ...[...pos.keys()].map((id) => timeline.calls.get(id)?.depth ?? 0)) + 1) * (NODE_H + GAP_Y) - GAP_Y;
  return { pos, width, height };
}

function TreeDiagram({
  timeline,
  statuses,
  visible,
  onSeek,
}: {
  timeline: CallTimeline;
  statuses: Map<string, CallStatus>;
  visible: (id: string) => boolean;
  onSeek: (step: number) => void;
}) {
  const { pos, width, height } = layoutTree(timeline, visible);
  const links: { from: string; to: string }[] = [];
  pos.forEach((_, id) => {
    const parent = timeline.calls.get(id)?.parentId;
    if (parent && pos.has(parent)) links.push({ from: parent, to: id });
  });
  return (
    <div className="relative" style={{ width, height }} role="group" aria-label="Call tree diagram">
      <svg aria-hidden className="pointer-events-none absolute inset-0" width={width} height={height}>
        {links.map(({ from, to }) => {
          const a = pos.get(from);
          const b = pos.get(to);
          if (!a || !b) return null;
          const status = statuses.get(to);
          const onChain = status === "current" || status === "active" || status === "threw";
          const x1 = a.x + NODE_W / 2;
          const y1 = a.y + NODE_H;
          const x2 = b.x + NODE_W / 2;
          const y2 = b.y;
          const my = (y1 + y2) / 2;
          return (
            <path
              key={`${from}-${to}`}
              d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
              fill="none"
              stroke={onChain ? "var(--primary)" : "var(--border)"}
              strokeWidth={onChain ? 2 : 1.25}
              strokeDasharray={status === "future" ? "4 4" : undefined}
            />
          );
        })}
      </svg>
      {[...pos.entries()].map(([id, p]) => {
        const call = timeline.calls.get(id);
        const status = statuses.get(id);
        if (!call || !status) return null;
        return (
          <CallCard
            key={id}
            call={call}
            status={status}
            onSeek={onSeek}
            style={{ position: "absolute", left: p.x, top: p.y, width: NODE_W, height: NODE_H }}
          />
        );
      })}
    </div>
  );
}

function OutlineNode({
  id,
  timeline,
  statuses,
  visible,
  onSeek,
}: {
  id: string;
  timeline: CallTimeline;
  statuses: Map<string, CallStatus>;
  visible: (id: string) => boolean;
  onSeek: (step: number) => void;
}) {
  const call = timeline.calls.get(id);
  const status = statuses.get(id);
  if (!call || !status) return null;
  const kids = call.children.filter(visible);
  return (
    <li role="treeitem" aria-selected={status === "current"} aria-expanded={kids.length > 0 ? true : undefined} className="my-1">
      <div className="flex items-center gap-1">
        {call.depth > 0 && <CornerDownRightIcon className="size-3 shrink-0 text-muted-foreground" aria-hidden />}
        <CallCard call={call} status={status} onSeek={onSeek} style={{ minWidth: NODE_W + 40 }} />
      </div>
      {kids.length > 0 && (
        <ul role="group" className="ml-5 border-l border-border pl-3">
          {kids.map((kid) => (
            <OutlineNode key={kid} id={kid} timeline={timeline} statuses={statuses} visible={visible} onSeek={onSeek} />
          ))}
        </ul>
      )}
    </li>
  );
}
