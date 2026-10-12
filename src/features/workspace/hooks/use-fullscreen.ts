"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Full-screen mode for the visualization. The panel itself is shown as a fixed overlay and the whole
 * document enters browser full screen, so menus and tooltips (portalled to <body>) keep working.
 * Browsers without the Fullscreen API (e.g. iPhone Safari) still get the overlay.
 */
export function useFullscreen() {
  const [active, setActive] = useState(false);

  const exit = useCallback(async () => {
    setActive(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // already exited
    }
  }, []);

  const enter = useCallback(async () => {
    setActive(true);
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    } catch {
      // not allowed or unsupported: the overlay still fills the window
    }
  }, []);

  const toggle = useCallback(() => void (active ? exit() : enter()), [active, enter, exit]);

  // Leaving browser full screen (Esc, browser UI) also closes the overlay.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setActive(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Esc closes the overlay when the browser isn't in native full screen.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) void exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, exit]);

  return { active, toggle, enter, exit };
}
