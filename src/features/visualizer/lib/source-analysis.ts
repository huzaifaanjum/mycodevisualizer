/**
 * Lightweight, language-agnostic-enough analysis of C-family source lines (Java today) used to
 * phrase loop and branch notes. It never executes anything; it only reads line text and braces.
 */

export type ControlKind = "for" | "while" | "do-while" | "if" | "else-if" | "else";

export interface ControlLine {
  kind: ControlKind;
  /** The condition text, e.g. `i < nums.length`; empty for `else`. */
  condition: string;
  /** For `for` loops, the update part, e.g. `i++`. */
  update?: string;
  /** Last line (1-based) of the statement's body. */
  bodyEnd: number;
}

const FOR = /^\s*for\s*\((.*)\)\s*\{?\s*$/;
const WHILE = /^\s*while\s*\((.*)\)\s*\{?\s*$/;
const DO_WHILE_END = /^\s*\}\s*while\s*\((.*)\)\s*;\s*$/;
const IF = /^\s*if\s*\((.*)\)\s*\{?\s*$/;
const ELSE_IF = /^\s*\}?\s*else\s+if\s*\((.*)\)\s*\{?\s*$/;
const ELSE = /^\s*\}?\s*else\s*\{?\s*$/;

/** Splits `init; cond; update` respecting parentheses. */
function splitFor(header: string): [string, string, string] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of header) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === ";" && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current.trim());
  return [parts[0] ?? "", parts[1] ?? "", parts[2] ?? ""];
}

/** Finds the line where the block opened on `lineIndex` (0-based) closes. */
export function findBlockEnd(lines: string[], lineIndex: number): number {
  const start = lines[lineIndex] ?? "";
  if (!start.includes("{")) {
    // Single-statement body on the next line.
    return Math.min(lineIndex + 2, lines.length);
  }
  let depth = 0;
  for (let i = lineIndex; i < lines.length; i++) {
    const text = stripLiterals(lines[i] ?? "");
    for (let c = 0; c < text.length; c++) {
      // On the first line, only count braces from the opening one onwards (handles `} else {`).
      if (i === lineIndex && c < text.lastIndexOf("{") && text[c] === "}") continue;
      if (text[c] === "{") depth++;
      if (text[c] === "}") {
        depth--;
        if (depth === 0) return i + 1;
      }
    }
  }
  return lines.length;
}

function stripLiterals(line: string): string {
  return line.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""').replace(/\/\/.*$/, "");
}

export function analyzeLine(lines: string[], line: number): ControlLine | undefined {
  const text = lines[line - 1];
  if (text === undefined) return undefined;
  const bodyEnd = () => findBlockEnd(lines, line - 1);
  let m: RegExpExecArray | null;
  if ((m = FOR.exec(text))) {
    const [, condition, update] = splitFor(m[1] ?? "");
    return { kind: "for", condition, update, bodyEnd: bodyEnd() };
  }
  if ((m = WHILE.exec(text))) return { kind: "while", condition: (m[1] ?? "").trim(), bodyEnd: bodyEnd() };
  if ((m = DO_WHILE_END.exec(text))) return { kind: "do-while", condition: (m[1] ?? "").trim(), bodyEnd: line };
  if ((m = ELSE_IF.exec(text))) return { kind: "else-if", condition: (m[1] ?? "").trim(), bodyEnd: bodyEnd() };
  if ((m = IF.exec(text))) return { kind: "if", condition: (m[1] ?? "").trim(), bodyEnd: bodyEnd() };
  if (ELSE.test(text)) return { kind: "else", condition: "", bodyEnd: bodyEnd() };
  return undefined;
}

/** Identifiers used in an expression, e.g. `i < nums.length` -> ["i", "nums"]. */
export function identifiersIn(expression: string): string[] {
  const withoutMembers = expression.replace(/\.\s*[A-Za-z_]\w*/g, "");
  const ids = withoutMembers.match(/\b[A-Za-z_]\w*\b/g) ?? [];
  const keywords = new Set(["true", "false", "null", "new", "instanceof", "int", "double", "char", "boolean", "long"]);
  return [...new Set(ids.filter((id) => !keywords.has(id)))];
}
