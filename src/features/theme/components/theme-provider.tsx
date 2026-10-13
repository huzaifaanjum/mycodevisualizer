"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { DEFAULT_THEME, type ThemeId } from "@/shared/constants";
import { applyTheme, isThemeId, storeTheme } from "../lib/theme";

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_EVENT = "mcv:theme";

/**
 * The theme lives on <html data-theme>, set before paint by THEME_INIT_SCRIPT from local storage.
 * React reads it as an external store, so there is no flash and no hydration mismatch.
 */
function subscribe(callback: () => void): () => void {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(
    subscribe,
    () => {
      const current = document.documentElement.dataset.theme;
      return isThemeId(current) ? current : DEFAULT_THEME;
    },
    () => DEFAULT_THEME,
  );

  const setTheme = useCallback((next: ThemeId) => {
    applyTheme(next);
    storeTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
