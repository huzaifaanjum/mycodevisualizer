import { PLAYBACK_SPEEDS, type PlaybackSpeed } from "@/shared/constants";

export interface PlaybackState {
  index: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  /** Source line of every step, so breakpoints can be checked without the trace. */
  lines: number[];
  breakpoints: ReadonlySet<number>;
}

export type PlaybackAction =
  | { type: "load"; lines: number[]; autoplay: boolean }
  | { type: "play" }
  | { type: "pause" }
  | { type: "toggle" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "first" }
  | { type: "last" }
  | { type: "seek"; index: number }
  | { type: "tick" }
  | { type: "setSpeed"; speed: PlaybackSpeed }
  | { type: "toggleBreakpoint"; line: number }
  | { type: "clearBreakpoints" };

export const initialPlaybackState: PlaybackState = {
  index: 0,
  isPlaying: false,
  speed: 1,
  lines: [],
  breakpoints: new Set(),
};

const lastIndex = (s: PlaybackState) => Math.max(0, s.lines.length - 1);
const clamp = (s: PlaybackState, i: number) => Math.min(Math.max(0, i), lastIndex(s));

export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case "load":
      return { ...state, lines: action.lines, index: 0, isPlaying: action.autoplay && action.lines.length > 1 };
    case "play":
      if (state.lines.length < 2) return state;
      // Playing from the end restarts from the beginning.
      return { ...state, isPlaying: true, index: state.index >= lastIndex(state) ? 0 : state.index };
    case "pause":
      return state.isPlaying ? { ...state, isPlaying: false } : state;
    case "toggle":
      return playbackReducer(state, { type: state.isPlaying ? "pause" : "play" });
    case "next":
      return { ...state, isPlaying: false, index: clamp(state, state.index + 1) };
    case "prev":
      return { ...state, isPlaying: false, index: clamp(state, state.index - 1) };
    case "first":
      return { ...state, isPlaying: false, index: 0 };
    case "last":
      return { ...state, isPlaying: false, index: lastIndex(state) };
    case "seek":
      return { ...state, isPlaying: false, index: clamp(state, action.index) };
    case "tick": {
      if (!state.isPlaying) return state;
      const index = clamp(state, state.index + 1);
      const atEnd = index >= lastIndex(state);
      const line = state.lines[index];
      const hitBreakpoint = line !== undefined && state.breakpoints.has(line);
      return { ...state, index, isPlaying: !(atEnd || hitBreakpoint) };
    }
    case "setSpeed":
      return PLAYBACK_SPEEDS.includes(action.speed) ? { ...state, speed: action.speed } : state;
    case "toggleBreakpoint": {
      const breakpoints = new Set(state.breakpoints);
      if (breakpoints.has(action.line)) breakpoints.delete(action.line);
      else breakpoints.add(action.line);
      return { ...state, breakpoints };
    }
    case "clearBreakpoints":
      return { ...state, breakpoints: new Set() };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
