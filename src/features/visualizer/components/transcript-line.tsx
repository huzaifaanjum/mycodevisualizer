"use client";

import { SparklesIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getProgress, useNarratorStatus } from "@/features/narration";
import { cn } from "@/lib/utils";
import { STEP_NARRATION_OWNER } from "../hooks/use-step-narration";
import { splitSentences, spokenSoFar } from "../lib/subtitles";

/** How often the caption checks where the voice is; short enough for words to appear smoothly. */
const POLL_MS = 80;
const PLACEHOLDER = "The explanation appears here, word by word, as it's spoken.";

/**
 * One line of AI transcript, like live captions. With narration on, only spoken words show: the
 * words of the current sentence appear as they are said, and the last ones stay until the next
 * sentence starts. With narration off it shows `text` (the explanation of this step). A placeholder
 * fills the line when there is nothing to show yet.
 */
export function TranscriptLine({ text, narrating }: { text: string; narrating: boolean }) {
  const status = useNarratorStatus();
  const speaking = status.state === "speaking" && status.owner === STEP_NARRATION_OWNER ? status.text : null;
  const sentences = useMemo(() => (speaking ? splitSentences(speaking) : []), [speaking]);
  const [spoken, setSpoken] = useState("");
  const lineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (sentences.length === 0) return;
    const tick = () => setSpoken(spokenSoFar(sentences, getProgress()));
    tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [sentences]);

  const live = speaking !== null && spoken !== "";
  const shown = narrating ? spoken : text;

  // Long sentences scroll so the newest words stay in view.
  useLayoutEffect(() => {
    const el = lineRef.current;
    if (el) el.scrollLeft = live ? el.scrollWidth : 0;
  }, [shown, live]);

  return (
    <div aria-label="AI transcript" className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
      <SparklesIcon className={cn("size-4 shrink-0", live ? "text-primary animate-pulse" : "text-primary/70")} aria-hidden />
      <p
        ref={lineRef}
        title={shown || undefined}
        className={cn(
          "min-w-0 flex-1 overflow-hidden text-sm whitespace-nowrap",
          !live && "truncate",
          shown ? "text-foreground/90" : "text-muted-foreground italic",
        )}
      >
        {shown || PLACEHOLDER}
      </p>
    </div>
  );
}
