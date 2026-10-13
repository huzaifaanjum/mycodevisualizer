"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Example } from "@/shared/examples";

/**
 * Shown above the editor when an example is loaded: title and topic on one line with an
 * expand/collapse toggle on the right. Expanding reveals the full description.
 */
export function ExampleBanner({ example }: { example: Pick<Example, "title" | "topic" | "description"> }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card/60 border-b p-3 text-sm">
      <div className="flex items-center gap-2">
        <h1 className="min-w-0 truncate font-medium">{example.title}</h1>
        <Badge variant="outline" className="shrink-0">
          {example.topic}
        </Badge>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="example-description"
          aria-label={expanded ? "Hide description" : "Show description"}
          title={expanded ? "Hide description" : "Show description"}
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring ml-auto flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronDownIcon
            aria-hidden
            className={cn("size-4 transition-transform duration-200", expanded && "rotate-180")}
          />
        </button>
      </div>
      <div
        id="example-description"
        hidden={!expanded}
        className="text-muted-foreground mt-1.5 text-justify leading-relaxed hyphens-auto"
      >
        {example.description}
      </div>
    </div>
  );
}
