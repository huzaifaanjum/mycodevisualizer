"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50", className)}
      {...props}
    >
      {/* The untravelled track is a tint of the text color, so it stays visible in every theme. */}
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--foreground)_18%,transparent)]">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-4 rounded-full border-2 border-primary bg-background shadow transition-[box-shadow] focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none" />
    </SliderPrimitive.Root>
  );
}

export { Slider };
