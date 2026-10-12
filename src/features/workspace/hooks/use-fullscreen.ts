"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Full-screen mode for the visualization. The panel itself is shown as a fixed overlay and the whole
 * document enters browser full screen, so menus and tooltips (portalled to <body>) keep working.
 * Browsers without the Fullscreen API (e.g. iPhone Safari) still get the overlay.
 */
export function useFullscreen() {
  const [active, setActive] = useState(false);
  // True only while WE hold native full screen. Browsers fire "fullscreenchange" asynchronously, so a
  // late event from a previous exit must not close a full screen the user just re-entered.
  const native = useRef(false);

  const exit = useCallback(async () => {
    native.current = false;
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
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        native.current = true;
      }
    } catch {
      // not allowed or unsupported: the overlay still fills the window
    }
  }, []);

  const toggle = useCallback(() => void (active ? exit() : enter()), [active, enter, exit]);

  // Leaving browser full screen through the browser (Esc, F11, browser UI) also closes the overlay.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement && native.current) {
        native.current = false;
        setActive(false);
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Esc closes the overlay (browsers in native full screen usually handle Esc themselves first).
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, exit]);

  return { active, toggle, enter, exit };
}
