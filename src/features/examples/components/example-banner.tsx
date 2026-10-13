"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Hint } from "@/components/ui/tooltip";
import { ListenButton } from "@/features/narration";
import { cn } from "@/lib/utils";
import type { Example } from "@/shared/examples";

/**
 * Shown above the editor when an example is loaded: title and topic on one line with an
 * expand/collapse toggle on the right. Expanding reveals the full description. With narration set
 * up, a speaker button reads the problem statement aloud.
 */
export function ExampleBanner({
  example,
  canListen = false,
}: {
  example: Pick<Example, "title" | "topic" | "description">;
  canListen?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="glass border-b p-3 text-sm">
      <div className="flex items-center gap-2">
        <h1 className="min-w-0 truncate font-medium">{example.title}</h1>
        <Badge variant="outline" className="shrink-0">
          {example.topic}
        </Badge>
        {canListen && (
          <ListenButton
            owner="example"
            texts={[`${example.title}. ${example.description}`]}
            label="Listen to the problem"
            className="ml-auto"
          />
        )}
        <Hint content={expanded ? "Hide description" : "Show description"}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="example-description"
          aria-label={expanded ? "Hide description" : "Show description"}
          className={cn(
            "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none",
            !canListen && "ml-auto",
          )}
        >
          <ChevronDownIcon
            aria-hidden
            className={cn("size-4 transition-transform duration-200", expanded && "rotate-180")}
          />
        </button>
        </Hint>
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
