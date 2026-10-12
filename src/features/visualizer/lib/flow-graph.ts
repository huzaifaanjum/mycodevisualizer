import type { Step, Trace } from "@/shared/trace";
import { analyzeLine, findBlockEnd } from "./source-analysis";

/**
 * Builds a per-method flowchart of ONE execution: which lines ran, how often, and which paths
 * between them were taken with this input. It is derived from the trace (what really happened),
 * with source lines used only to name nodes and to show lines that never ran.
 */

export type FlowNodeKind = "start" | "end" | "statement" | "decision" | "loop" | "io" | "call" | "return";

/** Pseudo line numbers for the start and end terminals of each method's flowchart. */
export const START_LINE = -1;
export const END_LINE = 1_000_000;

export interface FlowNode {
  line: number;
  text: string;
  kind: FlowNodeKind;
  /** Times execution arrived here, up to the current step. */
  visits: number;
  /** Times over the whole run. 0 means this line never ran with this input. */
  totalVisits: number;
  /** Every step index (whole run) at which execution arrived here, in order. */
  steps: number[];
  /** Methods called from this line over the whole run, with counts up to the current step. */
  calls: { method: string; count: number; total: number }[];
}

export type FlowEdgeLabel = "true" | "false" | "repeat" | "enter" | "return";

export interface FlowEdge {
  from: number;
  to: number;
  /** Times taken up to the current step. */
  count: number;
  /** Times taken over the whole run. */
  total: number;
  label?: FlowEdgeLabel;
}

export interface MethodFlow {
  key: string;
  method: string;
  className: string;
  /** Declaration text, e.g. "static int factorial(int n)"; null when it couldn't be found. */
  signature: string | null;
  /** Activations up to the current step / over the whole run. */
  calls: number;
  totalCalls: number;
  /** Start terminal, lines in source order, end terminal. */
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** Line the program is on now, if the current step is inside this method. */
  currentLine: number | null;
  /** The transition that led to the current step, if it happened inside this method. */
  lastEdge: { from: number; to: number } | null;
}

type Transition =
  | { type: "visit"; method: string; line: number; activation: boolean }
  | { type: "edge"; method: string; from: number; to: number }
  | { type: "exit"; method: string; from: number }
  | { type: "call"; method: string; line: number; callee: string };

const methodKey = (className: string, method: string) => `${className}.${method}`;

/** What happened between step k-1 and step k, as a list of transitions (computed once per trace). */
export function traceTransitions(trace: Trace): Transition[][] {
  return trace.steps.map((step, k) => {
    const out: Transition[] = [];
    const prev: Step | undefined = k > 0 ? trace.steps[k - 1] : undefined;
    // An exception step repeats the frames of the step that threw; nothing new happened.
    if (step.event === "exception") return out;
    const ids = new Set(step.frames.map((f) => f.id));

    // Calls that finished: leave their method through its end terminal.
    for (const f of prev?.frames ?? []) {
      if (!ids.has(f.id)) out.push({ type: "exit", method: methodKey(f.className, f.method), from: f.line });
    }

    const top = step.frames.at(-1);
    if (!top || step.event === "end") return out;
    const key = methodKey(top.className, top.method);
    const prevTop = prev?.frames.at(-1);
    const isNewActivation = !prevTop || !prev?.frames.some((f) => f.id === top.id);

    if (prev && prevTop && !isNewActivation) {
      if (prevTop.id === top.id) {
        if (prev.line !== step.line) out.push({ type: "edge", method: key, from: prev.line, to: step.line });
      } else {
        // Returned into this frame: continue from the line it was waiting on.
        const before = prev.frames.find((f) => f.id === top.id);
        if (before && before.line !== step.line) out.push({ type: "edge", method: key, from: before.line, to: step.line });
      }
    }
    if (isNewActivation && prevTop) {
      const caller = step.frames.at(-2);
      if (caller) {
        out.push({ type: "call", method: methodKey(caller.className, caller.method), line: caller.line, callee: top.method });
      }
    }
    // Resuming a line after a call returns is not a new arrival at that line.
    if (step.event !== "return") out.push({ type: "visit", method: key, line: step.line, activation: isNewActivation });
    return out;
  });
}

const BRACE_ONLY = /^\s*(\}\s*)*(else\s*)?\{?\s*$/;
const COMMENT = /^\s*(\/\/|\/\*|\*)/;
const IO = /\bSystem\s*\.\s*(out|err)\s*\.\s*print|\.\s*(next|nextLine|nextInt|nextDouble|nextLong|nextBoolean|hasNext\w*)\s*\(/;

/** Lines worth showing as nodes even if they never ran: things that look like statement starts. */
function isStatementLike(text: string): boolean {
  if (!text.trim() || BRACE_ONLY.test(text) || COMMENT.test(text)) return false;
  if (/^\s*\}?\s*else\b/.test(text) && !/\bif\s*\(/.test(text)) return false;
  return /[;{)]\s*(\/\/.*)?$/.test(text);
}

function nodeKind(lines: string[], line: number, callsOut: boolean): FlowNodeKind {
  const text = lines[line - 1] ?? "";
  const control = analyzeLine(lines, line);
  if (control) {
    return control.kind === "for" || control.kind === "while" || control.kind === "do-while" ? "loop" : "decision";
  }
  if (/^\s*return\b/.test(text)) return "return";
  if (callsOut) return "call";
  if (IO.test(text)) return "io";
  return "statement";
}

function edgeLabel(lines: string[], from: number, to: number): FlowEdgeLabel | undefined {
  if (from === START_LINE) return "enter";
  if (to === END_LINE) return "return";
  if (to <= from) return "repeat";
  const control = analyzeLine(lines, from);
  if (!control || control.kind === "else" || control.kind === "do-while") return undefined;
  return to > from && to <= control.bodyEnd ? "true" : "false";
}

/** Finds the line declaring `method` above `firstLine` and the line where its body ends. */
function methodSpan(lines: string[], method: string, firstLine: number): { decl: number; end: number } | null {
  const declaration = new RegExp(`\\b${method.replace(/[^\w$]/g, "")}\\s*\\(`);
  for (let l = firstLine; l >= 1; l--) {
    const text = lines[l - 1] ?? "";
    if (declaration.test(text) && !/;\s*$/.test(text) && !/\bnew\s/.test(text)) {
      if (!text.includes("{") && !(lines[l] ?? "").trim().startsWith("{")) continue;
      const openLine = text.includes("{") ? l : l + 1;
      return { decl: l, end: findBlockEnd(lines, openLine - 1) };
    }
  }
  return null;
}

interface Counter {
  now: number;
  total: number;
}

/** Flow for every method that ran, in order of first execution, with counts up to step `index`. */
export function buildFlow(trace: Trace, sourceLines: string[], index: number, transitions = traceTransitions(trace)): MethodFlow[] {
  interface Acc {
    flow: MethodFlow;
    visits: Map<number, Counter & { steps: number[] }>;
    edges: Map<string, FlowEdge>;
    calls: Map<number, Map<string, Counter>>;
    starts: number[];
    exits: Counter;
  }
  const methods = new Map<string, Acc>();
  const get = (key: string): Acc => {
    let acc = methods.get(key);
    if (!acc) {
      const dot = key.lastIndexOf(".");
      acc = {
        flow: {
          key,
          className: key.slice(0, dot),
          method: key.slice(dot + 1),
          signature: null,
          calls: 0,
          totalCalls: 0,
          nodes: [],
          edges: [],
          currentLine: null,
          lastEdge: null,
        },
        visits: new Map(),
        edges: new Map(),
        calls: new Map(),
        starts: [],
        exits: { now: 0, total: 0 },
      };
      methods.set(key, acc);
    }
    return acc;
  };
  const addEdge = (acc: Acc, from: number, to: number, k: number) => {
    const id = `${from}->${to}`;
    const e = acc.edges.get(id) ?? { from, to, count: 0, total: 0, label: edgeLabel(sourceLines, from, to) };
    e.total++;
    if (k <= index) e.count++;
    acc.edges.set(id, e);
    if (k === index) acc.flow.lastEdge = { from, to };
  };

  transitions.forEach((list, k) => {
    const upToNow = k <= index;
    for (const t of list) {
      const acc = get(t.method);
      switch (t.type) {
        case "visit": {
          const v = acc.visits.get(t.line) ?? { now: 0, total: 0, steps: [] };
          v.total++;
          v.steps.push(k);
          if (upToNow) v.now++;
          acc.visits.set(t.line, v);
          if (t.activation) {
            acc.flow.totalCalls++;
            if (upToNow) acc.flow.calls++;
            acc.starts.push(k);
            addEdge(acc, START_LINE, t.line, k);
          }
          break;
        }
        case "edge":
          addEdge(acc, t.from, t.to, k);
          break;
        case "exit":
          acc.exits.total++;
          if (upToNow) acc.exits.now++;
          addEdge(acc, t.from, END_LINE, k);
          break;
        case "call": {
          const byCallee = acc.calls.get(t.line) ?? new Map<string, Counter>();
          const c = byCallee.get(t.callee) ?? { now: 0, total: 0 };
          c.total++;
          if (upToNow) c.now++;
          byCallee.set(t.callee, c);
          acc.calls.set(t.line, byCallee);
          break;
        }
        default: {
          const exhaustive: never = t;
          return exhaustive;
        }
      }
    }
  });

  const current = trace.steps[index];
  const currentTop = current?.event === "end" ? undefined : current?.frames.at(-1);

  return [...methods.values()].map(({ flow, visits, edges, calls, starts, exits }) => {
    const executed = [...visits.keys()];
    const first = executed.length ? Math.min(...executed) : NaN;
    const span = Number.isFinite(first) ? methodSpan(sourceLines, flow.method, first) : null;
    const lines = new Set(executed);
    if (span) {
      flow.signature = (sourceLines[span.decl - 1] ?? "").trim().replace(/\s*\{\s*$/, "");
      for (let l = span.decl + 1; l < span.end; l++) {
        if (isStatementLike(sourceLines[l - 1] ?? "")) lines.add(l);
      }
    }
    const body: FlowNode[] = [...lines]
      .sort((a, b) => a - b)
      .map((line) => {
        const v = visits.get(line);
        const raw = (sourceLines[line - 1] ?? "").trim();
        const isClosingBrace = /^\}+$/.test(raw);
        const lineCalls = [...(calls.get(line) ?? new Map<string, Counter>()).entries()].map(([method, c]) => ({
          method,
          count: c.now,
          total: c.total,
        }));
        return {
          line,
          // The closing brace of a method is where it returns when there is no return statement.
          text: isClosingBrace ? `end of ${flow.method}() body` : raw,
          kind: isClosingBrace ? "return" : nodeKind(sourceLines, line, lineCalls.length > 0),
          visits: v?.now ?? 0,
          totalVisits: v?.total ?? 0,
          steps: v?.steps ?? [],
          calls: lineCalls,
        };
      });
    flow.nodes = [
      {
        line: START_LINE,
        text: flow.method === "main" ? "Start" : `Start ${flow.method}()`,
        kind: "start",
        visits: flow.calls,
        totalVisits: flow.totalCalls,
        steps: starts,
        calls: [],
      },
      ...body,
      {
        line: END_LINE,
        text: flow.method === "main" ? "End" : `Return to caller`,
        kind: "end",
        visits: exits.now,
        totalVisits: exits.total,
        steps: [],
        calls: [],
      },
    ];
    flow.edges = [...edges.values()].sort((a, b) => a.from - b.from || a.to - b.to);
    if (currentTop && methodKey(currentTop.className, currentTop.method) === flow.key) {
      flow.currentLine = current?.line ?? null;
    } else {
      flow.lastEdge = null;
    }
    return flow;
  });
}

/** The next step after `index` at which `node` runs, wrapping to its first run. */
export function nextRunOf(node: FlowNode, index: number): number | null {
  return node.steps.find((s) => s > index) ?? node.steps[0] ?? null;
}
