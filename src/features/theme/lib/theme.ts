import { THEMES, THEME_IDS, THEME_STORAGE_KEY, DEFAULT_THEME, type ThemeId } from "@/shared/constants";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

export function isDarkTheme(theme: ThemeId): boolean {
  return THEMES.find((t) => t.id === theme)?.dark ?? true;
}

export function storeTheme(theme: ThemeId): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage unavailable (private mode); the choice still applies for this visit
  }
}

export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme;
}

/**
 * Inline script run before paint so the saved theme never flashes. It is a constant string with
 * no user input, so it is safe to inline.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(${JSON.stringify(THEME_IDS)}.indexOf(t)>-1){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export { DEFAULT_THEME };
