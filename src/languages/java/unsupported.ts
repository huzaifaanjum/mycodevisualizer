import type { SourceIssue } from "../types";

interface Rule {
  pattern: RegExp;
  message: string;
}

/**
 * Features outside the Coding 101 scope, or that could misuse the sandbox. The sandbox is the real
 * security boundary; these checks give students a clear message instead of a confusing failure.
 */
const RULES: Rule[] = [
  {
    pattern: /\b(Thread|ExecutorService|Executors|CompletableFuture)\b/,
    message: "Threads aren't supported yet - this tool shows one line running at a time.",
  },
  {
    pattern: /\bjava\.net\b|\b(Socket|ServerSocket|HttpClient|URL)\b/,
    message: "Network access isn't available in the visualizer.",
  },
  {
    pattern: /\b(ProcessBuilder|Runtime\s*\.\s*getRuntime)\b/,
    message: "Starting other programs isn't allowed in the visualizer.",
  },
  {
    pattern:
      /\bjava\.nio\.file\b|\b(FileReader|FileWriter|FileInputStream|FileOutputStream|Files)\b|\bnew\s+File\s*\(/,
    message: "Reading or writing files isn't supported. Use the Input box and System.in instead.",
  },
  {
    pattern: /\bjava\.lang\.reflect\b|\bgetDeclaredMethod\b|\bsetAccessible\b/,
    message: "Reflection isn't supported in the visualizer.",
  },
  { pattern: /\bnative\s+\w/, message: "Native methods aren't supported." },
];

export function findUnsupportedJavaFeatures(code: string): SourceIssue[] {
  const issues: SourceIssue[] = [];
  const lines = stripCommentsAndStrings(code).split("\n");
  for (const rule of RULES) {
    const lineIndex = lines.findIndex((l) => rule.pattern.test(l));
    if (lineIndex >= 0) issues.push({ line: lineIndex + 1, message: rule.message });
  }
  return issues;
}

/** Blanks out comments and string/char literals while keeping line structure, so rules don't match text. */
export function stripCommentsAndStrings(code: string): string {
  let out = "";
  let i = 0;
  while (i < code.length) {
    const c = code[i];
    const next = code[i + 1];
    if (c === "/" && next === "/") {
      while (i < code.length && code[i] !== "\n") i++;
    } else if (c === "/" && next === "*") {
      i += 2;
      while (i < code.length && !(code[i] === "*" && code[i + 1] === "/")) {
        out += code[i] === "\n" ? "\n" : " ";
        i++;
      }
      i += 2;
    } else if (c === '"' || c === "'") {
      const quote = c;
      out += quote;
      i++;
      while (i < code.length && code[i] !== quote && code[i] !== "\n") {
        i += code[i] === "\\" ? 2 : 1;
      }
      out += quote;
      i++;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}
