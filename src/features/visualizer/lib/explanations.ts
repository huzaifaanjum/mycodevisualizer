/** Plain-language explanations shown in the visualizer's (i) tooltips. Keep each one short. */
export interface Explanation {
  title: string;
  text: string;
}

export const EXPLAIN = {
  memoryTab: {
    title: "Memory",
    text: "A snapshot of memory at this step: the variables each method is using, and the arrays and objects they point to.",
  },
  flowTab: {
    title: "Flow",
    text: "Your code as a flowchart. The highlighted path is the way this run went, and the numbers count how often each part ran.",
  },
  callsTab: {
    title: "Call tree",
    text: "Every method call, drawn as a tree. When a method calls another one, the new call hangs below it. Click a call to jump there.",
  },
  callStack: {
    title: "Call stack",
    text: "The methods that are running right now. Calling a method puts a new frame on top; when it returns, its frame is removed.",
  },
  frame: {
    title: "Frame",
    text: "One method call and its own variables. Every call gets a fresh frame, even when the same method is called again.",
  },
  running: {
    title: "Running",
    text: "The method whose line is being run right now. The others below it are waiting for it to finish.",
  },
  waiting: {
    title: "Waiting",
    text: "This method called another method and is paused until that call returns. Then it carries on from the same line.",
  },
  variable: {
    title: "Variable",
    text: "Each row is one variable: its type, its name, and the value it holds right now. A highlighted row changed in this step.",
  },
  heap: {
    title: "Heap",
    text: "Where Java keeps arrays and objects. A variable never holds them directly; it holds a reference (an arrow) to one of them here.",
  },
  reference: {
    title: "Reference",
    text: "This variable doesn't hold the object itself. It holds an arrow that points to the object on the heap.",
  },
  array: {
    title: "Array",
    text: "A fixed-size row of values of one type. Each box has an index, and the first index is 0.",
  },
  object: {
    title: "Object",
    text: "An object made from a class. Its fields are the values it keeps inside.",
  },
  libraryObject: {
    title: "Library object",
    text: "An object from Java's built-in library. Its insides are hidden to keep things simple.",
  },
  list: {
    title: "List",
    text: "Items kept in order. A list can grow and shrink, and positions start at 0.",
  },
  set: {
    title: "Set",
    text: "A group of values with no repeats. Adding a value that is already there changes nothing.",
  },
  map: {
    title: "Map",
    text: "Pairs of key → value. Each key appears once and is used to look up its value.",
  },
  aliases: {
    title: "Same object, several names",
    text: "These variables all point to this one object. A change made through any of them is seen by all of them.",
  },
  input: {
    title: "Input",
    text: "What the program reads, for example with Scanner. Crossed-out values are already read; the underlined one is read next.",
  },
  output: {
    title: "Output",
    text: "Everything the program has printed so far. Text printed by this step is highlighted.",
  },
  step: {
    title: "This step",
    text: "What the highlighted line just did, in plain words. Use the player at the top to move one step at a time.",
  },
} as const satisfies Record<string, Explanation>;
