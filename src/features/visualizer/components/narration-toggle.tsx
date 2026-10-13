"use client";

import {
  AudioLinesIcon,
  CaptionsIcon,
  CaptionsOffIcon,
  LoaderCircleIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import { useNarratorStatus } from "@/features/narration";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { STEP_NARRATION_OWNER } from "../hooks/use-step-narration";

/** Turns spoken, line-by-line narration of the run on or off. */
export function NarrationToggle({
  enabled,
  preparing = false,
  onToggle,
  error,
}: {
  enabled: boolean;
  /** Waiting for the AI explanation before the first words are spoken. */
  preparing?: boolean;
  onToggle: () => void;
  /** Why narration stopped by itself, shown until it is turned on again. */
  error?: string;
}) {
  const status = useNarratorStatus();
  const mine = status.state !== "idle" && status.owner === STEP_NARRATION_OWNER;
  const loading = preparing || (enabled && mine && status.state === "loading");
  const speaking = enabled && mine && status.state === "speaking";
  const VolumeIcon = enabled ? Volume2Icon : VolumeXIcon;

  return (
    <div className="flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={enabled ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label="Narrate"
            aria-pressed={enabled}
            onClick={onToggle}
            className={cn(enabled && "text-primary")}
          >
            {loading ? (
              <LoaderCircleIcon className="animate-spin" aria-hidden />
            ) : speaking ? (
              <AudioLinesIcon className="animate-pulse" aria-hidden />
            ) : (
              <VolumeIcon aria-hidden />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">
          {preparing
            ? "Preparing a line-by-line explanation of your code…"
            : enabled
            ? "Stop reading the steps aloud"
            : "Turn on the voice. Press play to hear the overview and each step, or move between steps to hear about that step."}
        </TooltipContent>
      </Tooltip>
      {error && !enabled && (
        <span role="status" className="max-w-48 truncate text-xs text-danger" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}

/** Shows or hides the one-line transcript above the input and output. */
export function TranscriptToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={shown ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label="Transcript"
          aria-pressed={shown}
          onClick={onToggle}
          className={cn(shown && "text-primary")}
        >
          {shown ? <CaptionsIcon aria-hidden /> : <CaptionsOffIcon aria-hidden />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{shown ? "Hide the transcript" : "Show the transcript: the explanation, one line at a time"}</TooltipContent>
    </Tooltip>
  );
}
