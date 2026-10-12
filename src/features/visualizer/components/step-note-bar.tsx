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
export function StepNoteBar({ notes, stepNumber, total }: { notes: StepNote[]; stepNumber: number; total: number }) {
  return (
    <div className="border-b bg-card/60 px-3 py-2.5">
      <div className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        Step {stepNumber} of {total}
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
