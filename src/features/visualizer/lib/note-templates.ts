/**
 * All user-facing step-note wording lives here so it can be translated later.
 * Every template is a pure function of already-formatted strings.
 */
export const noteTemplates = {
  programStart: (method: string) => `The program starts in ${method}(). A frame for it is placed on the call stack.`,
  programEnd: () => "The program finished. All frames have been removed from the call stack.",
  call: (method: string, args: string) =>
    args ? `${method}(${args}) was called. A new frame was added to the top of the stack.` : `${method}() was called. A new frame was added to the top of the stack.`,
  returnValue: (method: string, value: string, to: string) =>
    `${method} returned ${value} to ${to}. Its frame was removed from the stack.`,
  returnVoid: (to: string) => `The method finished and control went back to ${to}.`,
  declared: (name: string, value: string) => `${name} was created with the value ${value}.`,
  changed: (name: string, from: string, to: string) => `${name} changed from ${from} to ${to}.`,
  arrayCell: (name: string, index: number, from: string, to: string) => `${name}[${index}] changed from ${from} to ${to}.`,
  field: (name: string, field: string, from: string, to: string) => `${name}.${field} changed from ${from} to ${to}.`,
  declaredRef: (name: string, description: string) => `${name} was created and refers to ${description}.`,
  reassignedRef: (name: string, description: string) => `${name} now refers to ${description}.`,
  listAdded: (name: string, value: string, index: number, size: number) =>
    `${value} was added to ${name} at index ${index}. ${name} now has ${countOf(size)}.`,
  listRemoved: (name: string, value: string, index: number, size: number) =>
    `${value} was removed from ${name} (it was at index ${index}). ${name} now has ${countOf(size)}.`,
  listChanged: (name: string, index: number, from: string, to: string) => `${name}[${index}] was replaced: ${from} → ${to}.`,
  setAdded: (name: string, value: string, size: number) => `${value} was added to the set ${name}. It now has ${countOf(size)}.`,
  setRemoved: (name: string, value: string, size: number) => `${value} was removed from the set ${name}. It now has ${countOf(size)}.`,
  mapAdded: (name: string, key: string, value: string, size: number) =>
    `${name} got a new entry ${key} → ${value}. It now has ${countOf(size, "entry", "entries")}.`,
  mapRemoved: (name: string, key: string, size: number) =>
    `The entry for ${key} was removed from ${name}. It now has ${countOf(size, "entry", "entries")}.`,
  mapChanged: (name: string, key: string, from: string, to: string) => `${name}: the value for ${key} changed from ${from} to ${to}.`,
  collectionCleared: (name: string) => `${name} was cleared. It is now empty.`,
  collectionSummary: (name: string, added: number, removed: number, changed: number, size: number) =>
    `${name} changed: ${[
      added && `${added} added`,
      removed && `${removed} removed`,
      changed && `${changed} replaced`,
    ]
      .filter(Boolean)
      .join(", ")}. It now has ${countOf(size)}.`,
  input: (text: string) => `Scanner read "${text}" from the input.`,
  output: (text: string) => `The program printed ${text}.`,
  conditionTrue: (kind: string, condition: string, values: string) =>
    `The ${kind} condition ${condition} is true${values}, so its body runs.`,
  conditionFalse: (kind: string, condition: string, values: string) =>
    `The ${kind} condition ${condition} is false${values}, so its body is skipped.`,
  loopExit: (condition: string, values: string) => `The loop condition ${condition} is false${values}, so the loop ends.`,
  loopRepeat: (update: string) =>
    update ? `The loop body finished. ${update} runs, then the condition is checked again.` : "The loop body finished. The condition is checked again.",
  elseTaken: () => "The earlier condition was false, so the else block runs.",
  exception: (type: string, line: number, explanation: string) => `Line ${line} threw ${type}. ${explanation}`,
  nextLine: (line: number) => `Next, line ${line} runs.`,
  /** Spoken before a step's notes, naming the line whose effects the notes describe. */
  spokenLineRan: (line: number) => `Line ${line} ran.`,
  /** The AI explanation of the line that runs next, spoken after the effects of the last one. */
  spokenNextLine: (line: number, explanation: string) => `Line ${line}. ${explanation}`,
  /** Spoken at the end, after the AI's closing line. */
  keyTakeaways: (details: string[]) => `Here's what to remember. ${details.join(" ")}`,
  valuesSuffix: (pairs: string) => ` (${pairs})`,
} as const;

function countOf(n: number, one = "element", many = "elements"): string {
  return `${n} ${n === 1 ? one : many}`;
}
