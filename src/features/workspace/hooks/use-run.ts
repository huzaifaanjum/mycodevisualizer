"use client";

import { useCallback, useRef, useState } from "react";
import { ApiRequestError, apiRequest } from "@/shared/api/client";
import type { LanguageId } from "@/shared/constants";
import { expandTrace, TraceSchema, type Trace } from "@/shared/trace";

export type RunState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "ready"; trace: Trace; source: string; stdin: string }
  | { status: "error"; error: ApiRequestError };

/** Sends code to POST /api/runs and tracks the request lifecycle. Cancels stale requests. */
export function useRun() {
  const [state, setState] = useState<RunState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(async (language: LanguageId, code: string, stdin: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "running" });
    try {
      const raw = await apiRequest("/api/runs", {
        method: "POST",
        body: { language, code, stdin },
        schema: TraceSchema,
        signal: controller.signal,
      });
      // Heaps arrive as per-step deltas to keep responses small; rebuild full heaps once here.
      setState({ status: "ready", trace: expandTrace(raw), source: code, stdin });
    } catch (err) {
      if (controller.signal.aborted) return;
      setState({
        status: "error",
        error: err instanceof ApiRequestError ? err : new ApiRequestError("INTERNAL", "Couldn't reach the server. Check your connection."),
      });
    }
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setState({ status: "idle" });
  }, []);

  return { state, run, reset };
}
