"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** An icon-only on/off button for the visualizer toolbar; its name and hint live in the tooltip. */
export function IconToggle({
  label,
  pressed,
  onToggle,
  icon,
  hint,
}: {
  /** Accessible name, e.g. "Legend". */
  label: string;
  pressed: boolean;
  onToggle: () => void;
  icon: ReactNode;
  /** Tooltip text for the current state. */
  hint: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={pressed ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onToggle}
          className={cn(pressed && "text-primary")}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{hint}</TooltipContent>
    </Tooltip>
  );
}
