import type { CodeExplanation } from "@/shared/api";
import { noteTemplates as t } from "./note-templates";
import type { StepNote } from "./step-notes";

/**
 * The fallback when there is no AI explanation: the step's own notes, which already match the
 * editor. They describe what the last line did (faint highlight) and end with the line that runs
 * next (bright highlight): "sum changed from 0 to 3. Next, line 6 runs."
 */
export function spokenStep(notes: StepNote[]): string {
  return notes.map((n) => n.text).join(" ");
}

export interface NarrationInput {
  notes: StepNote[];
  /** The line about to run (bright highlight); undefined at the end or after a crash. */
  nextLine: number | undefined;
  /** True when this is the first time the program reaches `nextLine`. */
  firstVisit: boolean;
  explanation: CodeExplanation | undefined;
}

/**
 * The spoken clips for one step. With an AI explanation: first what just happened (the notes, with
 * real values), then the AI's words for the line about to run, in full on the first visit and the
 * short form on later visits. At the end, the AI's closing line and key takeaways.
 * Clips are kept separate so repeated ones (a loop's short form) are synthesized only once.
 */
export function narrationClips({ notes, nextLine, firstVisit, explanation }: NarrationInput): string[] {
  if (!explanation) return [spokenStep(notes)];
  const happened = notes.filter((n) => n.kind !== "next").map((n) => n.text).join(" ");
  const clips = [happened];
  if (nextLine !== undefined) {
    const entry = explanation.lines.find((l) => l.line === nextLine);
    clips.push(entry ? t.spokenNextLine(nextLine, firstVisit ? entry.explain : entry.brief) : t.nextLine(nextLine));
  } else if (notes.some((n) => n.kind === "end")) {
    clips.push(explanation.closing);
    if (explanation.keyInsights.length > 0) clips.push(t.keyTakeaways(explanation.keyInsights.map((k) => k.detail)));
  }
  return clips.filter((c) => c.trim());
}

/** First step index at which each line runs, so narration knows when a line is new. */
export function firstVisits(lines: number[]): Map<number, number> {
  const first = new Map<number, number>();
  lines.forEach((line, index) => {
    if (!first.has(line)) first.set(line, index);
  });
  return first;
}
