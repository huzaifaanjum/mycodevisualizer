export interface Presence<T> {
  key: string;
  item: T;
  /** Gone in `current`; still rendered so it can animate out. */
  exiting: boolean;
}

/**
 * Merges `current` with the items of `previous` that disappeared, keeping each departed item
 * near the position it had before, so the view can animate it out instead of dropping it.
 */
export function withExiting<T>(current: T[], previous: T[], keyOf: (item: T) => string): Presence<T>[] {
  const result: Presence<T>[] = current.map((item) => ({ key: keyOf(item), item, exiting: false }));
  const present = new Set(result.map((p) => p.key));
  previous.forEach((item, index) => {
    const key = keyOf(item);
    if (present.has(key)) return;
    result.splice(Math.min(index, result.length), 0, { key, item, exiting: true });
  });
  return result;
}
