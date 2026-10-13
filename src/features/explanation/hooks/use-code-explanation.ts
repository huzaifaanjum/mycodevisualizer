"use client";

import { useEffect, useState } from "react";
import { CodeExplanationSchema, type CodeExplanation, type ExplainRequest } from "@/shared/api";
import { apiRequest } from "@/shared/api/client";

export type ExplanationState =
  | { status: "off" }
  | { status: "loading" }
  | { status: "ready"; explanation: CodeExplanation }
  | { status: "error"; message: string };

/** Explanations fetched in this tab, so running the same code again (or stepping back) is instant. */
const cache = new Map<string, Promise<CodeExplanation>>();
const MAX_CACHED = 30;

function fetchExplanation(request: ExplainRequest): Promise<CodeExplanation> {
  const key = JSON.stringify(request);
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = apiRequest("/api/explanations", { method: "POST", body: request, schema: CodeExplanationSchema });
  pending.catch(() => cache.delete(key)); // never cache a failure
  cache.set(key, pending);
  while (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return pending;
}

/** A plain-English, line-by-line AI explanation of `request`, fetched while `enabled`. */
export function useCodeExplanation(request: ExplainRequest | null): ExplanationState {
  const key = request ? JSON.stringify(request) : null;
  const [state, setState] = useState<{ key: string | null; value: ExplanationState }>({ key: null, value: { status: "off" } });

  useEffect(() => {
    if (!key) return;
    const parsed = JSON.parse(key) as ExplainRequest;
    let current = true;
    fetchExplanation(parsed).then(
      (explanation) => current && setState({ key, value: { status: "ready", explanation } }),
      (err: unknown) =>
        current &&
        setState({ key, value: { status: "error", message: err instanceof Error ? err.message : "The AI explanation failed." } }),
    );
    return () => {
      current = false;
    };
  }, [key]);

  if (!key) return { status: "off" };
  return state.key === key ? state.value : { status: "loading" };
}
