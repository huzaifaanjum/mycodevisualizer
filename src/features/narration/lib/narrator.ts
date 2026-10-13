"use client";

import { ApiErrorSchema } from "@/shared/api";
import { ApiRequestError } from "@/shared/api/client";
import { speakable } from "./speakable";

export type NarratorStatus =
  | { state: "idle" }
  | { state: "loading"; owner: string; text: string }
  | { state: "speaking"; owner: string; text: string }
  | { state: "error"; owner: string; message: string };

export type SpeakResult = "ended" | "stopped";

/** Clips kept as object URLs in this tab; replaying a step or an example costs nothing. */
const MAX_CLIPS = 150;
const clips = new Map<string, Promise<string>>();
const listeners = new Set<() => void>();
let status: NarratorStatus = { state: "idle" };
let audio: HTMLAudioElement | undefined;
let session = 0;
let cancelCurrent: (() => void) | undefined;

function setStatus(next: NarratorStatus) {
  status = next;
  listeners.forEach((listener) => listener());
}

async function fetchClip(text: string): Promise<string> {
  const res = await fetch("/api/narration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    credentials: "same-origin",
  });
  if (!res.ok) {
    const parsed = ApiErrorSchema.safeParse(await res.json().catch(() => null));
    if (parsed.success) {
      const { code, message, retryAfterSeconds } = parsed.data.error;
      throw new ApiRequestError(code, message, retryAfterSeconds);
    }
    throw new ApiRequestError("INTERNAL", "Narration failed. Try again.");
  }
  return URL.createObjectURL(await res.blob());
}

function clip(text: string): Promise<string> {
  const key = speakable(text);
  const cached = clips.get(key);
  if (cached) {
    clips.delete(key);
    clips.set(key, cached);
    return cached;
  }
  const pending = fetchClip(key);
  pending.catch(() => clips.delete(key)); // never cache a failure
  clips.set(key, pending);
  while (clips.size > MAX_CLIPS) {
    const oldest = clips.entries().next().value;
    if (!oldest) break;
    clips.delete(oldest[0]);
    oldest[1].then(URL.revokeObjectURL, () => undefined);
  }
  return pending;
}

function play(url: string, rate: number): Promise<SpeakResult> {
  audio ??= new Audio();
  const el = audio;
  el.src = url;
  el.playbackRate = rate;
  return new Promise<SpeakResult>((resolve, reject) => {
    const finish = (result: SpeakResult | Error) => {
      el.onended = null;
      el.onerror = null;
      cancelCurrent = undefined;
      if (result instanceof Error) reject(result);
      else resolve(result);
    };
    cancelCurrent = () => {
      el.pause();
      finish("stopped");
    };
    el.onended = () => finish("ended");
    el.onerror = () => finish(new Error("The audio could not be played."));
    el.play().catch((err: unknown) => {
      const blocked = err instanceof DOMException && err.name === "NotAllowedError";
      finish(new Error(blocked ? "Your browser blocked sound. Press the narration button again." : "The audio could not be played."));
    });
  });
}

/** Fetches audio ahead of time so the next clip starts without a pause. Errors are ignored here. */
export function preload(text: string): void {
  if (text.trim()) clip(text).catch(() => undefined);
}

/**
 * Speaks the texts one after another, interrupting anything already playing. `owner` names who is
 * speaking (for example "example" or "steps"), so each button can show its own state.
 * Resolves "stopped" when interrupted by another speak() or stop(); rejects on a real failure.
 */
export async function speak(texts: string[], options: { owner: string; rate?: number }): Promise<SpeakResult> {
  const id = ++session;
  cancelCurrent?.();
  const queue = texts.filter((t) => t.trim());
  queue.slice(1).forEach(preload);
  try {
    for (const text of queue) {
      setStatus({ state: "loading", owner: options.owner, text });
      const url = await clip(text);
      if (id !== session) return "stopped";
      setStatus({ state: "speaking", owner: options.owner, text });
      const result = await play(url, options.rate ?? 1);
      if (result === "stopped" || id !== session) return "stopped";
    }
    setStatus({ state: "idle" });
    return "ended";
  } catch (err) {
    if (id !== session) return "stopped";
    const message = err instanceof Error ? err.message : "Narration failed. Try again.";
    setStatus({ state: "error", owner: options.owner, message });
    throw err;
  }
}

/** Stops whatever is playing. */
export function stop(): void {
  session++;
  cancelCurrent?.();
  if (status.state !== "idle") setStatus({ state: "idle" });
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStatus(): NarratorStatus {
  return status;
}

/** How far through the current clip the voice is, from 0 to 1 (0 when nothing is playing). */
export function getProgress(): number {
  if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return 0;
  return Math.min(1, audio.currentTime / audio.duration);
}
