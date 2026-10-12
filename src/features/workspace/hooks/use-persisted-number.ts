"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function read(key: string, fallback: number, min: number, max: number): number {
  try {
    const raw = window.localStorage.getItem(key);
    const value = raw === null ? Number.NaN : Number(raw);
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * A number kept in localStorage (per viewer, per browser) and read as an external store, so the
 * server render and first client render agree and there is no hydration mismatch.
 */
export function usePersistedNumber(key: string, fallback: number, min: number, max: number): [number, (value: number) => void] {
  const subscribe = useCallback((callback: () => void) => {
    listeners.add(callback);
    window.addEventListener("storage", callback);
    return () => {
      listeners.delete(callback);
      window.removeEventListener("storage", callback);
    };
  }, []);
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback, min, max),
    () => fallback,
  );
  const set = useCallback(
    (next: number) => {
      const clamped = Math.round(Math.min(max, Math.max(min, next)) * 10) / 10;
      try {
        window.localStorage.setItem(key, String(clamped));
      } catch {
        // storage unavailable: the change still applies until reload via the listeners below
      }
      listeners.forEach((l) => l());
    },
    [key, min, max],
  );
  return [value, set];
}
