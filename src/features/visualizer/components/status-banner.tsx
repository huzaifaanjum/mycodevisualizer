import { CircleAlertIcon, TimerIcon } from "lucide-react";
import { LIMITS } from "@/shared/constants";
import type { Step, Trace } from "@/shared/trace";

/** Explains why a run stopped early (limits) or crashed (exception) at the relevant step. */
export function StatusBanner({
  trace,
  step,
  isLastStep,
  explainException,
}: {
  trace: Trace;
  step: Step | undefined;
  isLastStep: boolean;
  explainException: (type: string, message: string) => string;
}) {
  if (trace.status === "truncated" && isLastStep) {
    const text =
      trace.truncatedReason === "STEP_LIMIT"
        ? `Stopped after ${LIMITS.maxSteps.toLocaleString("en-US")} steps. Is there a loop that never ends?`
        : trace.truncatedReason === "OUTPUT_LIMIT"
          ? "Stopped because the program printed too much output."
          : `Stopped after ${LIMITS.executionTimeoutMs / 1000} seconds. Is there a loop that never ends, or is the program waiting for more input?`;
    return (
      <div role="status" className="flex items-start gap-2 border-b border-changed/30 bg-changed/10 px-3 py-2 text-sm text-changed">
        <TimerIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        {text}
      </div>
    );
  }
  if (step?.event === "exception" && step.exception) {
    return (
      <div role="alert" className="border-b border-danger/30 bg-danger/10 px-3 py-2 text-sm">
        <div className="flex items-center gap-2 font-semibold text-danger">
          <CircleAlertIcon className="size-4" aria-hidden />
          {step.exception.type} on line {step.exception.line}
        </div>
        <p className="mt-1 text-foreground/90">{explainException(step.exception.type, step.exception.message)}</p>
        {step.exception.message && <p className="mt-1 font-mono text-xs text-muted-foreground">{step.exception.message}</p>}
      </div>
    );
  }
  return null;
}
