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
import { cn } from "@/lib/utils";
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
    <div className="border-b bg-card/60 px-3 py-2.5">
      <div className="mb-1 flex min-w-0 items-baseline gap-3">
        <span className="shrink-0 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Step {stepNumber} of {total}
        </span>
        {line !== undefined && (
          <code className="min-w-0 truncate text-xs text-muted-foreground" title={lineText}>
            <span className="text-primary">line {line}</span>
            {lineText ? `  ${lineText}` : ""}
          </code>
        )}
      </div>
      <ul aria-live="polite" aria-atomic="true" className="space-y-1 text-sm">
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
                  note.kind === "exception" ? "text-danger" : note.kind === "change" || note.kind === "heap" ? "text-changed" : note.kind === "input" ? "text-stdin" : "text-primary",
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
