"use client";

import { ChevronDownIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Example } from "@/shared/examples";

/** Shown above the editor when an example is loaded: title and topic, then a one-line description that can expand. */
export function ExampleBanner({ example }: { example: Pick<Example, "title" | "topic" | "description"> }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  // Only offer "More" when the collapsed line actually cuts text off; re-check when the width changes.
  useEffect(() => {
    const el = descriptionRef.current;
    if (!el || expanded) return;
    const measure = () => setOverflows(el.scrollWidth > el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, example.description]);

  const canToggle = overflows || expanded;

  return (
    <div className="bg-card/60 border-b px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 truncate font-medium">{example.title}</h1>
        <Badge variant="outline" className="shrink-0">
          {example.topic}
        </Badge>
      </div>
      <div className="mt-0.5 flex items-start gap-2">
        <p
          ref={descriptionRef}
          id="example-description"
          className={cn("text-muted-foreground min-w-0 flex-1", !expanded && "truncate")}
        >
          {example.description}
        </p>
        {canToggle && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls="example-description"
            className="text-primary focus-visible:ring-ring flex shrink-0 items-center gap-0.5 rounded text-xs font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {expanded ? "Less" : "More"}
            <ChevronDownIcon
              aria-hidden
              className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
            />
          </button>
        )}
      </div>
    </div>
  );
}
