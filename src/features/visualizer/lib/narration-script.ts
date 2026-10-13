import { noteTemplates as t } from "./note-templates";
import type { StepNote } from "./step-notes";

/**
 * What narration says for one step, matching the editor: a step's notes describe what the line
 * that just ran did (the faint highlight), and end with the line that runs next (the bright one).
 * So it says "Line 7 ran. sum changed from 0 to 3. Next, line 6 runs."
 */
export function spokenStep(notes: StepNote[], lineThatRan: number | undefined): string {
  return [lineThatRan === undefined ? "" : t.spokenLineRan(lineThatRan), ...notes.map((n) => n.text)]
    .filter(Boolean)
    .join(" ");
}
