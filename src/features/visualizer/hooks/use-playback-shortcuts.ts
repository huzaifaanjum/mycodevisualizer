"use client";

import { useEffect } from "react";
import type { PlaybackController } from "./use-playback";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
  return target.closest(".monaco-editor") !== null;
}

/** Space play/pause, arrows step, Home/End jump, B toggles a breakpoint on the current line. */
export function usePlaybackShortcuts(playback: PlaybackController, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const actions: Record<string, () => void> = {
        " ": playback.toggle,
        ArrowRight: playback.next,
        ArrowLeft: playback.prev,
        Home: playback.first,
        End: playback.last,
        b: () => playback.step && playback.toggleBreakpoint(playback.step.line),
        B: () => playback.step && playback.toggleBreakpoint(playback.step.line),
      };
      const action = actions[e.key];
      if (!action) return;
      // Let Space activate a focused button normally.
      if (e.key === " " && e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      action();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playback, enabled]);
}
