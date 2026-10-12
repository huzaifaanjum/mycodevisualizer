"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";
import { BASE_STEP_INTERVAL_MS, type PlaybackSpeed } from "@/shared/constants";
import type { Step, Trace } from "@/shared/trace";
import { initialPlaybackState, playbackReducer, type PlaybackState } from "../lib/playback";

export interface PlaybackController {
  state: PlaybackState;
  step: Step | undefined;
  previousStep: Step | undefined;
  total: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  first: () => void;
  last: () => void;
  seek: (index: number) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  toggleBreakpoint: (line: number) => void;
  clearBreakpoints: () => void;
}

/** Owns playback for one trace: index, autoplay timer, speed and breakpoints. */
export function usePlayback(trace: Trace | null, autoplay: boolean): PlaybackController {
  const [state, dispatch] = useReducer(playbackReducer, initialPlaybackState);

  useEffect(() => {
    dispatch({ type: "load", lines: trace?.steps.map((s) => s.line) ?? [], autoplay });
  }, [trace, autoplay]);

  useEffect(() => {
    if (!state.isPlaying) return;
    const id = window.setTimeout(() => dispatch({ type: "tick" }), BASE_STEP_INTERVAL_MS / state.speed);
    return () => window.clearTimeout(id);
  }, [state.isPlaying, state.index, state.speed]);

  const play = useCallback(() => dispatch({ type: "play" }), []);
  const pause = useCallback(() => dispatch({ type: "pause" }), []);
  const toggle = useCallback(() => dispatch({ type: "toggle" }), []);
  const next = useCallback(() => dispatch({ type: "next" }), []);
  const prev = useCallback(() => dispatch({ type: "prev" }), []);
  const first = useCallback(() => dispatch({ type: "first" }), []);
  const last = useCallback(() => dispatch({ type: "last" }), []);
  const seek = useCallback((index: number) => dispatch({ type: "seek", index }), []);
  const setSpeed = useCallback((speed: PlaybackSpeed) => dispatch({ type: "setSpeed", speed }), []);
  const toggleBreakpoint = useCallback((line: number) => dispatch({ type: "toggleBreakpoint", line }), []);
  const clearBreakpoints = useCallback(() => dispatch({ type: "clearBreakpoints" }), []);

  return useMemo(
    () => ({
      state,
      step: trace?.steps[state.index],
      previousStep: state.index > 0 ? trace?.steps[state.index - 1] : undefined,
      total: trace?.steps.length ?? 0,
      play,
      pause,
      toggle,
      next,
      prev,
      first,
      last,
      seek,
      setSpeed,
      toggleBreakpoint,
      clearBreakpoints,
    }),
    [state, trace, play, pause, toggle, next, prev, first, last, seek, setSpeed, toggleBreakpoint, clearBreakpoints],
  );
}
