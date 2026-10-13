import { LIMITS } from "@/shared/constants";

const JAVA_TYPES = "int|long|short|byte|double|float|char|boolean|String";

/** Ordered rewrites from code-ish notation to words a voice reads naturally. */
const RULES: [RegExp, string][] = [
  [/→/g, " becomes "],
  [new RegExp(`\\b(${JAVA_TYPES})\\[\\]`, "g"), "$1 array"],
  [new RegExp(`\\b(${JAVA_TYPES})\\[(\\d+)\\]`, "g"), "$1 array of length $2"],
  [/\b([A-Za-z_]\w*)\[([^\]]+)\]/g, "$1 at index $2"],
  [/\b([A-Za-z_]\w*)\(\)/g, "$1"],
  [/\b([A-Za-z_]\w*)\+\+/g, "$1 plus plus"],
  [/\b([A-Za-z_]\w*)--/g, "$1 minus minus"],
  [/\s*==\s*/g, " equals "],
  [/\s*!=\s*/g, " is not equal to "],
  [/\s*<=\s*/g, " is less than or equal to "],
  [/\s*>=\s*/g, " is greater than or equal to "],
  [/\s+<\s+/g, " is less than "],
  [/\s+>\s+/g, " is greater than "],
  [/\s*&&\s*/g, " and "],
  [/\s*\|\|\s*/g, " or "],
  [/\s+%\s+/g, " mod "],
  [/\s+\*\s+/g, " times "],
  [/\b([A-Za-z_]\w*)\.([A-Za-z_])/g, "$1 dot $2"],
  [/\s{2,}/g, " "],
];

/**
 * Rewrites a note for text-to-speech, e.g. `nums[i] changed` → `nums at index i changed` and
 * `i <= 5` → `i is less than or equal to 5`, and keeps it within the narration size limit.
 */
export function speakable(text: string): string {
  let spoken = RULES.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text).trim();
  if (spoken.length > LIMITS.maxNarrationChars) {
    const cut = spoken.slice(0, LIMITS.maxNarrationChars);
    const lastStop = cut.lastIndexOf(". ");
    spoken = lastStop > 0 ? cut.slice(0, lastStop + 1) : cut;
  }
  return spoken;
}
