"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { AccentId } from "@/shared/constants";
import { applyAccent, isAccentId, storeAccent } from "../lib/accent";

interface AccentContextValue {
  accent: AccentId;
  setAccent: (accent: AccentId) => void;
}

const AccentContext = createContext<AccentContextValue | null>(null);
const ACCENT_EVENT = "mcv:accent";

/**
 * The accent lives on <html data-accent>, set before paint by ACCENT_INIT_SCRIPT (from local storage)
 * or by the server (from the account). React reads it as an external store, so there is no flash and
 * no hydration mismatch.
 */
function subscribe(callback: () => void): () => void {
  window.addEventListener(ACCENT_EVENT, callback);
  return () => window.removeEventListener(ACCENT_EVENT, callback);
}

export function AccentProvider({
  initialAccent,
  persistToAccount,
  children,
}: {
  initialAccent: AccentId;
  /** When signed in, the choice is also saved to the user's profile. */
  persistToAccount: boolean;
  children: React.ReactNode;
}) {
  const accent = useSyncExternalStore(
    subscribe,
    () => {
      const current = document.documentElement.dataset.accent;
      return isAccentId(current) ? current : initialAccent;
    },
    () => initialAccent,
  );

  const setAccent = useCallback(
    (next: AccentId) => {
      applyAccent(next);
      storeAccent(next);
      window.dispatchEvent(new Event(ACCENT_EVENT));
      if (persistToAccount) {
        void fetch("/api/me/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accent: next }),
        }).catch(() => undefined);
      }
    },
    [persistToAccount],
  );

  const value = useMemo(() => ({ accent, setAccent }), [accent, setAccent]);
  return <AccentContext.Provider value={value}>{children}</AccentContext.Provider>;
}

export function useAccent(): AccentContextValue {
  const ctx = useContext(AccentContext);
  if (!ctx) throw new Error("useAccent must be used inside <AccentProvider>");
  return ctx;
}
