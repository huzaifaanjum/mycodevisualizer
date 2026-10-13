"use client";

import { ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const ZOOM_STEP = 10;

/** Zoom out · current percent (click to reset) · zoom in. `value` is a percent, 100 = normal size. */
export function ZoomControls({
  label,
  value,
  onChange,
  min,
  max,
  defaultValue = 100,
  className,
}: {
  label: string;
  value: number;
  onChange: (percent: number) => void;
  min: number;
  max: number;
  defaultValue?: number;
  className?: string;
}) {
  return (
    <div role="group" aria-label={`${label} zoom`} className={cn("flex items-center", className)}>
      <Hint content="Zoom out">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onChange(value - ZOOM_STEP)}
          disabled={value <= min}
          aria-label={`Zoom out ${label.toLowerCase()}`}
        >
          <ZoomOutIcon />
        </Button>
      </Hint>
      <Hint content={`Back to ${defaultValue}%`}>
        <button
          type="button"
          onClick={() => onChange(defaultValue)}
          aria-label={`Reset ${label.toLowerCase()} zoom (now ${Math.round(value)}%)`}
          className="w-10 rounded-md py-1 text-center font-mono text-[11px] text-muted-foreground tabular-nums hover:bg-accent hover:text-foreground"
        >
          {Math.round(value)}%
        </button>
      </Hint>
      <Hint content="Zoom in">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onChange(value + ZOOM_STEP)}
          disabled={value >= max}
          aria-label={`Zoom in ${label.toLowerCase()}`}
        >
          <ZoomInIcon />
        </Button>
      </Hint>
    </div>
  );
}
