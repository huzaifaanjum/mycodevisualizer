"use client";

import { InfoIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * A small (i) button that explains something in plain words. Opens on hover, focus or tap.
 * Pass `children` to use a label (for example an icon and a word) as the trigger instead of only the icon.
 */
export function InfoTip({
  title,
  text,
  children,
  side,
  hideIcon = false,
  className,
}: {
  title: string;
  text: string;
  children?: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  /** Leave out the (i) icon when `children` already reads as something you can ask about. */
  hideIcon?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen} delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={children ? undefined : `What is ${title.toLowerCase()}?`}
          onClick={() => setOpen(true)}
          className={cn(
            "text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex shrink-0 cursor-help items-center gap-1 rounded-sm transition-colors outline-none focus-visible:ring-2",
            className,
          )}
        >
          {children}
          {!hideIcon && <InfoIcon className="size-3.5 opacity-70" aria-hidden />}
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-72 space-y-1 py-2 leading-relaxed">
        <p className="font-semibold">{title}</p>
        <p className="text-muted-foreground">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}
