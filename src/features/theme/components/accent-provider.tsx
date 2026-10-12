"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AccentId } from "@/shared/constants";
import { applyAccent, readStoredAccent, storeAccent } from "../lib/accent";

interface AccentContextValue {
  accent: AccentId;
  setAccent: (accent: AccentId) => void;
}

const AccentContext = createContext<AccentContextValue | null>(null);

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
  const [accent, setAccentState] = useState<AccentId>(initialAccent);

  useEffect(() => {
    if (persistToAccount) return; // the server-provided account preference wins
    const stored = readStoredAccent();
    if (stored && stored !== accent) setAccentState(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read storage once on mount
  }, []);

  useEffect(() => applyAccent(accent), [accent]);

  const setAccent = useCallback(
    (next: AccentId) => {
      setAccentState(next);
      storeAccent(next);
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
