import { ACCENT_IDS, ACCENT_STORAGE_KEY, DEFAULT_ACCENT, type AccentId } from "@/shared/constants";

export function isAccentId(value: unknown): value is AccentId {
  return typeof value === "string" && (ACCENT_IDS as readonly string[]).includes(value);
}

export function storeAccent(accent: AccentId): void {
  try {
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  } catch {
    // storage unavailable (private mode); the choice still applies for this visit
  }
}

export function applyAccent(accent: AccentId): void {
  document.documentElement.dataset.accent = accent;
}

/**
 * Inline script run before paint so the saved accent never flashes. It is a constant string with
 * no user input, so it is safe to inline.
 */
export const ACCENT_INIT_SCRIPT = `(function(){try{var a=localStorage.getItem(${JSON.stringify(
  ACCENT_STORAGE_KEY,
)});if(${JSON.stringify(ACCENT_IDS)}.indexOf(a)>-1&&!document.documentElement.dataset.serverAccent){document.documentElement.dataset.accent=a;}}catch(e){}})();`;

export { DEFAULT_ACCENT };
