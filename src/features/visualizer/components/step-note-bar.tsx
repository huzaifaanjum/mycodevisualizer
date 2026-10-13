import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CornerDownRightIcon,
  GitBranchIcon,
  KeyboardIcon,
  LightbulbIcon,
  LoaderCircleIcon,
  SparklesIcon,
  type LucideIcon,
  PlayIcon,
  RefreshCwIcon,
  SquarePenIcon,
  TerminalIcon,
} from "lucide-react";
import { InfoTip } from "@/components/common/info-tip";
import { cn } from "@/lib/utils";
import { EXPLAIN } from "../lib/explanations";
import type { NoteKind, StepNote } from "../lib/step-notes";

/** The AI explanation's part in this step: its words for the line about to run, and more. */
export interface StepAiNote {
  loading: boolean;
  error?: string;
  /** Explanation of the line about to run (full on its first visit, short after that). */
  lineText?: string;
  /** What the whole program does; shown on the first step. */
  summary?: string;
  /** Shown when the program has finished. */
  closing?: string;
  insights?: { title: string; detail: string }[];
}

const ICONS: Record<NoteKind, LucideIcon> = {
  start: PlayIcon,
  end: CircleCheckIcon,
  call: ArrowDownToLineIcon,
  return: ArrowUpFromLineIcon,
  assign: SquarePenIcon,
  change: SquarePenIcon,
  heap: SquarePenIcon,
  input: KeyboardIcon,
  output: TerminalIcon,
  branch: GitBranchIcon,
  loop: RefreshCwIcon,
  exception: CircleAlertIcon,
  next: CornerDownRightIcon,
};

/** Plain-English explanation of the current step. Announced to screen readers. */
export function StepNoteBar({
  notes,
  stepNumber,
  total,
  line,
  lineText,
  ai,
}: {
  notes: StepNote[];
  stepNumber: number;
  total: number;
  /** Current line, shown with its code so the step makes sense even when the editor is hidden. */
  line?: number;
  lineText?: string;
  ai?: StepAiNote;
}) {
  return (
    <div className="bg-card/60 max-h-56 shrink-0 overflow-auto border-b px-3 py-2.5">
      <div className="mb-2 flex min-w-0 items-center gap-2">
        <span className="text-muted-foreground shrink-0 text-[11px] font-semibold tracking-wider uppercase">
          Step {stepNumber} of {total}
        </span>
        <InfoTip title={EXPLAIN.step.title} text={EXPLAIN.step.text} side="top" />
        {line !== undefined && (
          <code className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs" title={lineText}>
            <span className="bg-primary/10 text-primary shrink-0 rounded px-1.5 py-0.5 font-medium">
              line {line}
            </span>
            {lineText && <span className="truncate">{lineText}</span>}
          </code>
        )}
      </div>
      <ul aria-live="polite" aria-atomic="true" className="space-y-1.5 text-sm">
        {notes.map((note, i) => {
          const Icon = ICONS[note.kind];
          return (
            <li
              key={`${note.kind}-${i}`}
              className={cn(
                "flex gap-2",
                note.kind === "next" && "text-muted-foreground",
                note.kind === "exception" && "text-danger",
                note.kind === "change" || note.kind === "heap" ? "text-foreground" : undefined,
              )}
            >
              <Icon
                aria-hidden
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  note.kind === "exception"
                    ? "text-danger"
                    : note.kind === "change" || note.kind === "heap"
                      ? "text-changed"
                      : note.kind === "input"
                        ? "text-stdin"
                        : "text-primary",
                )}
              />
              <span>{note.text}</span>
            </li>
          );
        })}
      </ul>
      {ai && <AiNote ai={ai} line={line} />}
    </div>
  );
}

/** The AI tutor's words for this step, set apart from the factual notes above. */
function AiNote({ ai, line }: { ai: StepAiNote; line?: number }) {
  if (ai.loading) {
    return (
      <p className="text-muted-foreground mt-2.5 flex items-center gap-2 text-xs">
        <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden />
        Preparing a plain-English explanation of your code…
      </p>
    );
  }
  if (ai.error) {
    return <p className="text-muted-foreground mt-2.5 text-xs">AI explanation unavailable: {ai.error}</p>;
  }
  if (!ai.summary && !ai.lineText && !ai.closing && !ai.insights?.length) return null;
  return (
    <div className="border-primary/25 bg-primary/5 mt-2.5 space-y-2 rounded-md border px-3 py-2 text-sm leading-relaxed">
      {ai.summary && (
        <p className="flex gap-2">
          <SparklesIcon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{ai.summary}</span>
        </p>
      )}
      {ai.lineText && (
        <p className="flex gap-2">
          <SparklesIcon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {line !== undefined && <span className="text-primary mr-1.5 font-mono text-xs font-medium">line {line}</span>}
            {ai.lineText}
          </span>
        </p>
      )}
      {ai.closing && (
        <p className="flex gap-2">
          <SparklesIcon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{ai.closing}</span>
        </p>
      )}
      {ai.insights && ai.insights.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">Key insights</p>
          <ul className="space-y-1">
            {ai.insights.map((insight) => (
              <li key={insight.title} className="flex gap-2">
                <LightbulbIcon className="text-changed mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  <span className="font-medium">{insight.title}.</span> {insight.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
