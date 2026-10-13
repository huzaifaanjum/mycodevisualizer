import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CornerDownRightIcon,
  GitBranchIcon,
  KeyboardIcon,
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
}: {
  notes: StepNote[];
  stepNumber: number;
  total: number;
  /** Current line, shown with its code so the step makes sense even when the editor is hidden. */
  line?: number;
  lineText?: string;
}) {
  return (
    <div className="bg-card/60 max-h-40 shrink-0 overflow-auto border-b px-3 py-2.5">
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
    </div>
  );
}
