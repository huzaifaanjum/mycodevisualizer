"use client";

import { useId } from "react";
import { Textarea } from "@/components/ui/textarea";
import { LIMITS } from "@/shared/constants";

export function StdinInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Input (stdin)
        </label>
        <span id={hintId} className="text-[11px] text-muted-foreground">
          Read in order by Scanner
        </span>
      </div>
      <Textarea
        id={id}
        aria-describedby={hintId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        spellCheck={false}
        maxLength={LIMITS.maxStdinBytes}
        placeholder={"e.g.\n5\n3 7 9"}
        className="min-h-0 flex-1 resize-none font-mono text-xs"
      />
    </div>
  );
}
