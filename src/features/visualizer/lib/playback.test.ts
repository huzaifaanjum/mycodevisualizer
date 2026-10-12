import { initialPlaybackState, playbackReducer, type PlaybackState } from "./playback";

const loaded = (lines: number[], autoplay = false): PlaybackState =>
  playbackReducer(initialPlaybackState, { type: "load", lines, autoplay });

describe("playbackReducer", () => {
  it("loads paused in step mode and playing in automated mode", () => {
    expect(loaded([1, 2, 3]).isPlaying).toBe(false);
    expect(loaded([1, 2, 3], true).isPlaying).toBe(true);
  });

  it("does not autoplay a single-step trace", () => {
    expect(loaded([1], true).isPlaying).toBe(false);
  });

  it("steps forward and back within bounds and pauses", () => {
    let s = loaded([1, 2, 3], true);
    s = playbackReducer(s, { type: "next" });
    expect(s).toMatchObject({ index: 1, isPlaying: false });
    s = playbackReducer(s, { type: "last" });
    s = playbackReducer(s, { type: "next" });
    expect(s.index).toBe(2);
    s = playbackReducer(s, { type: "first" });
    s = playbackReducer(s, { type: "prev" });
    expect(s.index).toBe(0);
  });

  it("seek clamps to the trace", () => {
    expect(playbackReducer(loaded([1, 2]), { type: "seek", index: 99 }).index).toBe(1);
    expect(playbackReducer(loaded([1, 2]), { type: "seek", index: -4 }).index).toBe(0);
  });

  it("tick advances and stops at the end", () => {
    let s = loaded([1, 2, 3], true);
    s = playbackReducer(s, { type: "tick" });
    expect(s).toMatchObject({ index: 1, isPlaying: true });
    s = playbackReducer(s, { type: "tick" });
    expect(s).toMatchObject({ index: 2, isPlaying: false });
  });

  it("tick does nothing while paused", () => {
    const s = loaded([1, 2, 3]);
    expect(playbackReducer(s, { type: "tick" })).toBe(s);
  });

  it("autoplay stops on a breakpoint line", () => {
    let s = loaded([5, 6, 7, 8]);
    s = playbackReducer(s, { type: "toggleBreakpoint", line: 7 });
    s = playbackReducer(s, { type: "play" });
    s = playbackReducer(s, { type: "tick" });
    s = playbackReducer(s, { type: "tick" });
    expect(s).toMatchObject({ index: 2, isPlaying: false });
  });

  it("toggles breakpoints on and off", () => {
    let s = playbackReducer(loaded([1]), { type: "toggleBreakpoint", line: 3 });
    expect(s.breakpoints.has(3)).toBe(true);
    s = playbackReducer(s, { type: "toggleBreakpoint", line: 3 });
    expect(s.breakpoints.has(3)).toBe(false);
    s = playbackReducer(playbackReducer(s, { type: "toggleBreakpoint", line: 4 }), { type: "clearBreakpoints" });
    expect(s.breakpoints.size).toBe(0);
  });

  it("play from the end restarts, toggle flips state", () => {
    let s = playbackReducer(loaded([1, 2, 3]), { type: "last" });
    s = playbackReducer(s, { type: "toggle" });
    expect(s).toMatchObject({ index: 0, isPlaying: true });
    s = playbackReducer(s, { type: "toggle" });
    expect(s.isPlaying).toBe(false);
  });

  it("only accepts known speeds", () => {
    const s = loaded([1, 2]);
    expect(playbackReducer(s, { type: "setSpeed", speed: 2 }).speed).toBe(2);
    expect(playbackReducer(s, { type: "setSpeed", speed: 3 as never }).speed).toBe(1);
  });
});
