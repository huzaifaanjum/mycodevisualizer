/** Plain-English explanations for the exceptions and compiler errors beginners hit most. */
const EXCEPTIONS: Record<string, (message: string) => string> = {
  ArrayIndexOutOfBoundsException: (m) => {
    const match = /Index (-?\d+) out of bounds for length (\d+)/.exec(m);
    if (match) {
      const [, index, length] = match;
      const last = Number(length) - 1;
      return `The code tried to use index ${index}, but the array only has ${length} element${length === "1" ? "" : "s"}. Valid indexes are 0 to ${last < 0 ? 0 : last}.`;
    }
    return "The code used an index that is outside the array. Array indexes start at 0 and stop at length - 1.";
  },
  StringIndexOutOfBoundsException: () =>
    "The code asked for a character position that doesn't exist in the String. Positions go from 0 to length() - 1.",
  NullPointerException: () =>
    "The code tried to use an object through a variable that holds null (it doesn't point to any object yet).",
  ArithmeticException: (m) =>
    m.includes("/ by zero")
      ? "The code divided an integer by zero, which Java doesn't allow."
      : "An arithmetic operation couldn't be completed.",
  InputMismatchException: () =>
    "Scanner expected a different kind of value. For example, nextInt() was called but the next input wasn't a whole number.",
  NoSuchElementException: () =>
    "Scanner tried to read more input than was provided. Add more lines to the Input box.",
  NumberFormatException: (m) => `The text couldn't be turned into a number (${m}).`,
  StackOverflowError: () =>
    "A method kept calling itself without stopping. Check that the recursion has a base case that is reached.",
  OutOfMemoryError: () => "The program used more memory than allowed. It may be creating too many objects.",
  ClassCastException: () => "The code tried to treat an object as a type it isn't.",
  NegativeArraySizeException: () => "An array was created with a negative size.",
};

export function explainJavaException(type: string, message: string): string {
  const explain = EXCEPTIONS[type];
  return explain ? explain(message) : `The program stopped because of a ${type}.`;
}

const DIAGNOSTICS: { pattern: RegExp; explain: (m: RegExpExecArray) => string }[] = [
  {
    pattern: /cannot find symbol\s+symbol:\s+(?:variable|method|class) (\w+)/,
    explain: (m) =>
      `Java doesn't know the name "${m[1]}". Check the spelling and that it was declared before this line.`,
  },
  { pattern: /';' expected/, explain: () => "A semicolon (;) is missing at the end of a statement." },
  {
    pattern: /incompatible types: (\S+) cannot be converted to (\S+)/,
    explain: (m) =>
      `${capitalize(withArticle(simple(m[1])))} value can't be stored in ${withArticle(simple(m[2]))} variable.`,
  },
  {
    pattern: /variable (\w+) might not have been initialized/,
    explain: (m) => `"${m[1]}" is used before it was given a value.`,
  },
  { pattern: /missing return statement/, explain: () => "This method must return a value on every path." },
  { pattern: /reached end of file while parsing/, explain: () => "A closing brace } is missing." },
  {
    pattern: /variable (\w+) is already defined/,
    explain: (m) => `"${m[1]}" was declared twice in the same scope.`,
  },
];

function withArticle(word: string): string {
  return `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function simple(name: string | undefined): string {
  return (name ?? "").replace(/^java\.lang\./, "");
}

export function explainJavaDiagnostic(message: string): string {
  for (const d of DIAGNOSTICS) {
    const m = d.pattern.exec(message);
    if (m) return d.explain(m);
  }
  return message.split("\n")[0] ?? message;
}
