import type { Frame, Step, Trace } from "@/shared/trace";
import { noteTemplates as t } from "./note-templates";
import { analyzeLine, identifiersIn } from "./source-analysis";
import { changedHeapSlots, formatValue, stdinSlice } from "./trace-helpers";

export type NoteKind =
  | "start"
  | "end"
  | "call"
  | "return"
  | "assign"
  | "change"
  | "heap"
  | "input"
  | "output"
  | "branch"
  | "loop"
  | "exception"
  | "next";

export interface StepNote {
  kind: NoteKind;
  text: string;
}

export interface NoteContext {
  trace: Trace;
  index: number;
  sourceLines: string[];
  stdin: string;
  explainException: (type: string, message: string) => string;
}

const MAX_PRINTED_CHARS = 60;

/**
 * Explains, in plain English, what happened between the previous step and this one.
 * Deterministic: the same trace and index always produce the same notes.
 */
export function describeStep(ctx: NoteContext): StepNote[] {
  const step = ctx.trace.steps[ctx.index];
  if (!step) return [];
  const prev = ctx.index > 0 ? ctx.trace.steps[ctx.index - 1] : undefined;
  const notes: StepNote[] = [];
  const top = step.frames.at(-1);

  if (!prev) {
    if (top) notes.push({ kind: "start", text: t.programStart(top.method) });
  } else {
    notes.push(...callAndReturnNotes(prev, step));
    notes.push(...variableNotes(prev, step));
    notes.push(...ioNotes(prev, step, ctx));
    notes.push(...controlFlowNotes(prev, step, ctx.sourceLines));
  }

  if (step.event === "exception" && step.exception) {
    const { type, message, line } = step.exception;
    notes.push({ kind: "exception", text: t.exception(type, line, ctx.explainException(type, message)) });
  } else if (step.event === "end") {
    notes.push({ kind: "end", text: t.programEnd() });
  } else {
    notes.push({ kind: "next", text: t.nextLine(step.line) });
  }
  return notes;
}

function callAndReturnNotes(prev: Step, step: Step): StepNote[] {
  const notes: StepNote[] = [];
  const ids = new Set(step.frames.map((f) => f.id));
  const prevIds = new Set(prev.frames.map((f) => f.id));
  const popped = prev.frames.filter((f) => !ids.has(f.id));
  const caller = step.frames.at(-1);
  const poppedTop = popped.at(-1);
  if (poppedTop && caller && step.event !== "end") {
    notes.push({
      kind: "return",
      text: step.returned
        ? t.returnValue(poppedTop.method, formatValue(step.returned.value, step.heap), caller.method)
        : t.returnVoid(caller.method),
    });
  }
  step.frames
    .filter((f) => !prevIds.has(f.id))
    .forEach((f) => notes.push({ kind: "call", text: t.call(f.method, argumentList(f, step)) }));
  return notes;
}

function argumentList(frame: Frame, step: Step): string {
  return frame.locals
    .filter((l) => l.name !== "this")
    .map((l) => `${l.name} = ${formatValue(l.value, step.heap)}`)
    .join(", ");
}

function variableNotes(prev: Step, step: Step): StepNote[] {
  const top = step.frames.at(-1);
  const before = top && prev.frames.find((f) => f.id === top.id);
  if (!top || !before) return [];
  const notes: StepNote[] = [];
  for (const local of top.locals) {
    const old = before.locals.find((l) => l.name === local.name);
    const now = formatValue(local.value, step.heap);
    if (!old) {
      notes.push({ kind: "assign", text: t.declared(local.name, now) });
    } else {
      const was = formatValue(old.value, prev.heap);
      if (was !== now) notes.push({ kind: "change", text: t.changed(local.name, was, now) });
    }
  }
  const names = new Map<string, string>();
  top.locals.forEach((l) => {
    if (l.value.kind === "ref" && !names.has(l.value.heapId)) names.set(l.value.heapId, l.name);
  });
  for (const slot of changedHeapSlots(prev, step)) {
    const [heapId = "", key = ""] = slot.split(":");
    const name = names.get(heapId);
    const obj = step.heap[heapId];
    const old = prev.heap[heapId];
    if (!name || !obj || !old) continue;
    if (obj.kind === "array" && old.kind === "array") {
      const i = Number(key);
      const from = old.items[i];
      const to = obj.items[i];
      if (from && to) notes.push({ kind: "heap", text: t.arrayCell(name, i, formatValue(from, prev.heap), formatValue(to, step.heap)) });
    } else if (obj.kind === "object" && old.kind === "object") {
      const from = old.fields.find((f) => f.name === key);
      const to = obj.fields.find((f) => f.name === key);
      if (from && to) notes.push({ kind: "heap", text: t.field(name, key, formatValue(from.value, prev.heap), formatValue(to.value, step.heap)) });
    }
  }
  return notes;
}

function ioNotes(prev: Step, step: Step, ctx: NoteContext): StepNote[] {
  const notes: StepNote[] = [];
  if (step.stdinConsumed > prev.stdinConsumed) {
    const text = stdinSlice(ctx.stdin, prev.stdinConsumed, step.stdinConsumed);
    if (text) notes.push({ kind: "input", text: t.input(text) });
  }
  if (step.stdoutLength > prev.stdoutLength) {
    let printed = ctx.trace.stdout.slice(prev.stdoutLength, step.stdoutLength).replace(/\r?\n$/, "");
    if (printed.length > MAX_PRINTED_CHARS) printed = `${printed.slice(0, MAX_PRINTED_CHARS)}…`;
    notes.push({ kind: "output", text: t.output(JSON.stringify(printed)) });
  }
  return notes;
}

function controlFlowNotes(prev: Step, step: Step, lines: string[]): StepNote[] {
  const top = step.frames.at(-1);
  const prevTop = prev.frames.at(-1);
  // Only reason about control flow when we stayed inside the same method activation.
  if (!top || !prevTop || top.id !== prevTop.id || step.event === "exception") return [];

  const from = analyzeLine(lines, prev.line);
  if (from && from.kind !== "else" && from.kind !== "do-while") {
    const values = conditionValues(from.condition, top, step);
    const enteredBody = step.line > prev.line && step.line <= from.bodyEnd;
    const isLoop = from.kind === "for" || from.kind === "while";
    if (isLoop) {
      return [
        enteredBody
          ? { kind: "loop", text: t.conditionTrue("loop", from.condition, values) }
          : { kind: "loop", text: t.loopExit(from.condition, values) },
      ];
    }
    return [
      enteredBody
        ? { kind: "branch", text: t.conditionTrue("if", from.condition, values) }
        : { kind: "branch", text: t.conditionFalse("if", from.condition, values) },
    ];
  }

  const to = analyzeLine(lines, step.line);
  if (to && (to.kind === "for" || to.kind === "while") && prev.line > step.line && prev.line <= to.bodyEnd) {
    return [{ kind: "loop", text: t.loopRepeat(to.update ?? "") }];
  }
  if (to?.kind === "else") return [{ kind: "branch", text: t.elseTaken() }];
  return [];
}

function conditionValues(condition: string, frame: Frame, step: Step): string {
  const pairs = identifiersIn(condition)
    .map((id) => frame.locals.find((l) => l.name === id))
    .filter((l) => l !== undefined && l.value.kind === "primitive")
    .map((l) => `${l?.name} is ${l ? formatValue(l.value, step.heap) : ""}`);
  return pairs.length ? t.valuesSuffix(pairs.join(", ")) : "";
}
