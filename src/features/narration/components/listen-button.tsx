"use client";

import { LoaderCircleIcon, SquareIcon, Volume2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNarratorStatus } from "../hooks/use-narrator-status";
import { speak, stop } from "../lib/narrator";

/** Reads `texts` aloud with the site's voice; press again to stop. */
export function ListenButton({
  owner,
  texts,
  label,
  className,
}: {
  /** Unique name for this button's speech, e.g. "example". */
  owner: string;
  texts: string[];
  /** What is read, for the tooltip: "Listen to the problem". */
  label: string;
  className?: string;
}) {
  const status = useNarratorStatus();
  const mine = status.state !== "idle" && status.owner === owner;
  const active = mine && (status.state === "loading" || status.state === "speaking");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={active ? "Stop reading" : label}
          aria-pressed={active}
          onClick={() => (active ? stop() : speak(texts, { owner }).catch(() => undefined))}
          className={cn(active && "text-primary", className)}
        >
          {mine && status.state === "loading" ? (
            <LoaderCircleIcon className="animate-spin" aria-hidden />
          ) : active ? (
            <SquareIcon className="fill-current" aria-hidden />
          ) : (
            <Volume2Icon aria-hidden />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{mine && status.state === "error" ? status.message : active ? "Stop reading" : label}</TooltipContent>
    </Tooltip>
  );
}
