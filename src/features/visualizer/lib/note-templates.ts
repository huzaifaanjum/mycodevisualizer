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
  valuesSuffix: (pairs: string) => ` (${pairs})`,
} as const;
