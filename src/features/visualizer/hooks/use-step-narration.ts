"use client";

import { useEffect, useRef } from "react";
import { preload, speak, stop } from "@/features/narration";
import type { PlaybackController } from "./use-playback";

export const STEP_NARRATION_OWNER = "steps";

/** Voice speed follows the playback speed, within a range that stays easy to follow. */
const voiceRate = (speed: number) => Math.min(1.5, Math.max(0.8, speed));

/**
 * While `enabled`, reads each step aloud as the learner reaches it (and the problem statement
 * before the first step). During autoplay the player waits for the voice before moving on.
 */
export function useStepNarration({
  enabled,
  playback,
  scriptFor,
  intro,
  ready = true,
  onError,
}: {
  enabled: boolean;
  playback: PlaybackController;
  /** Spoken clips for a step index, in order (empty when there is nothing to say). */
  scriptFor: (index: number) => string[];
  /** Read once before step 1, e.g. the example's title and description. */
  intro?: string;
  /** False while the script isn't final yet (an AI explanation is loading); narration waits. */
  ready?: boolean;
  /** Narration failed (for example rate limited); receives a message that is safe to show. */
  onError: (message: string) => void;
}) {
  const { index, speed } = playback.state;
  const { setHold } = playback;
  // Read through a ref so changing speed (or the script's identity) doesn't re-read the current step.
  const latest = useRef({ speed, scriptFor, onError });
  useEffect(() => {
    latest.current = { speed, scriptFor, onError };
  });
  const generation = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (!ready) {
      // Autoplay waits on this step until the explanation arrives (or fails), then narration starts.
      setHold(true);
      return;
    }
    const { scriptFor: script, speed: rate } = latest.current;
    const texts = [index === 0 && intro ? intro : "", ...script(index)];
    const mine = ++generation.current;
    setHold(true);
    // Fetch the next step's audio now, so it starts as soon as the learner (or autoplay) moves on.
    script(index + 1).forEach(preload);
    speak(texts, { owner: STEP_NARRATION_OWNER, rate: voiceRate(rate) }).then(
      () => {
        // A newer step owns the hold now; otherwise (finished, or stopped by another speaker) release it.
        if (mine === generation.current) setHold(false);
      },
      (err: unknown) => {
        if (mine !== generation.current) return;
        setHold(false);
        latest.current.onError(err instanceof Error ? err.message : "Narration failed. Try again.");
      },
    );
  }, [enabled, ready, index, intro, setHold]);

  // Turning narration off (or leaving the page) silences it and lets autoplay run freely again.
  useEffect(() => {
    if (!enabled) return;
    return () => {
      stop();
      setHold(false);
    };
  }, [enabled, setHold]);
}
