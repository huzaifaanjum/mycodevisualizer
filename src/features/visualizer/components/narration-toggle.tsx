"use client";

import { AudioLinesIcon, LoaderCircleIcon, Volume2Icon } from "lucide-react";
import { useNarratorStatus } from "@/features/narration";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { STEP_NARRATION_OWNER } from "../hooks/use-step-narration";

/** Turns spoken, line-by-line narration of the run on or off. */
export function NarrationToggle({
  enabled,
  onToggle,
  error,
}: {
  enabled: boolean;
  onToggle: () => void;
  /** Why narration stopped by itself, shown until it is turned on again. */
  error?: string;
}) {
  const status = useNarratorStatus();
  const mine = status.state !== "idle" && status.owner === STEP_NARRATION_OWNER;
  const loading = enabled && mine && status.state === "loading";
  const speaking = enabled && mine && status.state === "speaking";

  return (
    <div className="flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={enabled ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={enabled}
            onClick={onToggle}
            className={cn(enabled && "text-primary")}
          >
            {loading ? (
              <LoaderCircleIcon className="animate-spin" aria-hidden />
            ) : speaking ? (
              <AudioLinesIcon className="animate-pulse" aria-hidden />
            ) : (
              <Volume2Icon aria-hidden />
            )}
            Narrate
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">
          {enabled
            ? "Stop reading the steps aloud"
            : "Read each step aloud as it runs. While playing, the player waits for the voice before moving on."}
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
