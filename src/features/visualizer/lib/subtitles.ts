/** Splits spoken text into subtitle sentences. Decimals like 3.5 stay whole (no space after the dot). */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Which sentence the voice is on, given how far through the clip it is (0 to 1). Sentences are
 * weighted by length, since speech takes roughly as long as the text is.
 */
export function sentenceAt(sentences: string[], progress: number): number {
  if (sentences.length === 0) return -1;
  const total = sentences.reduce((sum, s) => sum + s.length, 0);
  const target = Math.min(Math.max(progress, 0), 1) * total;
  let reached = 0;
  for (let i = 0; i < sentences.length; i++) {
    reached += sentences[i]?.length ?? 0;
    if (target < reached) return i;
  }
  return sentences.length - 1;
}

/**
 * The words of the current sentence spoken so far, given progress through the clip (0 to 1):
 * words appear one by one as the voice reaches them, like live captions.
 */
export function spokenSoFar(sentences: string[], progress: number): string {
  const index = sentenceAt(sentences, progress);
  const sentence = sentences[index];
  if (!sentence) return "";
  const total = sentences.reduce((sum, s) => sum + s.length, 0);
  const start = sentences.slice(0, index).reduce((sum, s) => sum + s.length, 0);
  const within = (Math.min(Math.max(progress, 0), 1) * total - start) / sentence.length;
  const words = sentence.split(/\s+/);
  const reachedChars = within * sentence.length;
  let chars = 0;
  let shown = 0;
  for (const word of words) {
    if (shown > 0 && chars >= reachedChars) break;
    chars += word.length + 1;
    shown++;
  }
  return words.slice(0, shown).join(" ");
}
