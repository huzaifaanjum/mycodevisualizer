"use client";

import { ChevronFirstIcon, ChevronLastIcon, PauseIcon, PlayIcon, StepBackIcon, StepForwardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PLAYBACK_SPEEDS, type PlaybackSpeed } from "@/shared/constants";
import type { PlaybackController } from "../hooks/use-playback";

function ControlButton({ label, shortcut, onClick, disabled, children }: {
  label: string;
  shortcut: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} disabled={disabled}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label} <Kbd className="ml-1">{shortcut}</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

export function PlaybackBar({ playback }: { playback: PlaybackController }) {
  const { state, total } = playback;
  const atStart = state.index === 0;
  const atEnd = state.index >= total - 1;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-card/60 px-3 py-2">
      <div className="flex items-center gap-0.5">
        <ControlButton label="First step" shortcut="Home" onClick={playback.first} disabled={atStart}>
          <ChevronFirstIcon />
        </ControlButton>
        <ControlButton label="Previous step" shortcut="←" onClick={playback.prev} disabled={atStart}>
          <StepBackIcon />
        </ControlButton>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className="rounded-full"
              aria-label={state.isPlaying ? "Pause" : "Play"}
              onClick={playback.toggle}
              disabled={total < 2}
            >
              {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {state.isPlaying ? "Pause" : "Play"} <Kbd className="ml-1">Space</Kbd>
          </TooltipContent>
        </Tooltip>
        <ControlButton label="Next step" shortcut="→" onClick={playback.next} disabled={atEnd}>
          <StepForwardIcon />
        </ControlButton>
        <ControlButton label="Last step" shortcut="End" onClick={playback.last} disabled={atEnd}>
          <ChevronLastIcon />
        </ControlButton>
      </div>

      <div className="flex min-w-40 flex-1 items-center gap-3">
        <Slider
          aria-label="Step"
          min={0}
          max={Math.max(0, total - 1)}
          step={1}
          value={[state.index]}
          onValueChange={([v]) => v !== undefined && playback.seek(v)}
        />
        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {total === 0 ? 0 : state.index + 1}/{total}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Select value={String(state.speed)} onValueChange={(v) => playback.setSpeed(Number(v) as PlaybackSpeed)}>
          <SelectTrigger aria-label="Playback speed" className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAYBACK_SPEEDS.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}x
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.breakpoints.size > 0 && (
          <Button variant="ghost" size="sm" onClick={playback.clearBreakpoints} className="text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-danger" />
            Clear {state.breakpoints.size} breakpoint{state.breakpoints.size === 1 ? "" : "s"}
          </Button>
        )}
      </div>
    </div>
  );
}
