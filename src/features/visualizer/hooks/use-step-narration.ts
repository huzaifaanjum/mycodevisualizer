"use client";

import { useCallback, useEffect, useRef } from "react";
import { preload, speak, stop } from "@/features/narration";
import type { Trace } from "@/shared/trace";
import type { PlaybackController } from "./use-playback";

export const STEP_NARRATION_OWNER = "steps";

/** Voice speed follows the playback speed, within a range that stays easy to follow. */
const voiceRate = (speed: number) => Math.min(1.5, Math.max(0.8, speed));

/**
 * Reads steps aloud, driven only by the player. `enabled` just allows the voice; turning it on
 * says nothing by itself. Then:
 * - Play reads the current step and keeps going, waiting for the voice before each next step.
 *   The first step also reads the overview (`intro`).
 * - Pause silences the voice.
 * - Moving to a step (next, previous, first, last, the slider) reads that step.
 * - A new run says nothing until the learner plays or moves (unless it autoplays).
 */
export function useStepNarration({
  enabled,
  trace,
  playback,
  scriptFor,
  intro,
  ready = true,
  onError,
}: {
  enabled: boolean;
  trace: Trace;
  playback: PlaybackController;
  /** Spoken clips for a step index, in order (empty when there is nothing to say). */
  scriptFor: (index: number) => string[];
  /** The overview, read with the first step. */
  intro?: string;
  /** False while the script isn't final yet (an AI explanation is loading); speech waits for it. */
  ready?: boolean;
  /** Narration failed (for example rate limited); receives a message that is safe to show. */
  onError: (message: string) => void;
}) {
  const { index, speed, isPlaying } = playback.state;
  const { setHold } = playback;
  // Read through a ref so changing speed (or the script's identity) doesn't re-read the current step.
  const latest = useRef({ speed, scriptFor, onError, intro });
  useEffect(() => {
    latest.current = { speed, scriptFor, onError, intro };
  });
  const generation = useRef(0);
  /** A step the learner asked to hear while the explanation was still loading. */
  const pending = useRef<number | null>(null);

  /** Reads one step aloud, holding autoplay on it until the voice is done. */
  const say = useCallback(
    (stepIndex: number) => {
      const { scriptFor: script, speed: rate, intro: overview } = latest.current;
      const texts = [stepIndex === 0 && overview ? overview : "", ...script(stepIndex)];
      const mine = ++generation.current;
      setHold(true);
      // Fetch the next step's audio now, so it starts as soon as the learner (or autoplay) moves on.
      script(stepIndex + 1).forEach(preload);
      speak(texts, { owner: STEP_NARRATION_OWNER, rate: voiceRate(rate) }).then(
        () => {
          // A newer step owns the hold now; otherwise (finished, paused, or another speaker) release it.
          if (mine === generation.current) setHold(false);
        },
        (err: unknown) => {
          if (mine !== generation.current) return;
          setHold(false);
          latest.current.onError(err instanceof Error ? err.message : "Narration failed. Try again.");
        },
      );
    },
    [setHold],
  );

  const request = useCallback(
    (stepIndex: number) => {
      if (ready) {
        say(stepIndex);
      } else {
        // Wait for the explanation (or its failure); autoplay waits on this step meanwhile.
        pending.current = stepIndex;
        generation.current++;
        stop();
        setHold(true);
      }
    },
    [ready, say, setHold],
  );

  const silence = useCallback(() => {
    pending.current = null;
    generation.current++;
    stop();
    setHold(false);
  }, [setHold]);

  // React to what the player did since the last render.
  const last = useRef({ trace, index, isPlaying });
  useEffect(() => {
    const was = last.current;
    last.current = { trace, index, isPlaying };
    if (!enabled) return;
    if (was.trace !== trace) {
      // A new run: only speak if it starts playing by itself.
      if (isPlaying) request(index);
      else silence();
    } else if (was.index !== index) {
      request(index);
    } else if (was.isPlaying !== isPlaying) {
      if (isPlaying) request(index);
      else silence();
    }
  }, [enabled, trace, index, isPlaying, request, silence]);

  // The explanation arrived (or failed) while a step was waiting to be read.
  useEffect(() => {
    if (!enabled || !ready || pending.current === null) return;
    const stepIndex = pending.current;
    pending.current = null;
    say(stepIndex);
  }, [enabled, ready, say]);

  // Turning narration off (or leaving the page) silences it and lets autoplay run freely again.
  useEffect(() => {
    if (!enabled) return;
    return silence;
  }, [enabled, silence]);
}
