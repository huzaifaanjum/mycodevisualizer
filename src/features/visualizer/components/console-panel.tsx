import { cn } from "@/lib/utils";
import { stdinTokens } from "../lib/trace-helpers";

/** Program output so far, plus the input "tape" showing what Scanner has consumed. */
export function ConsolePanel({ output, stdin, stdinConsumed }: { output: string; stdin: string; stdinConsumed: number }) {
  const tokens = stdinTokens(stdin, stdinConsumed);
  return (
    <div className="flex h-full min-h-0 flex-col">
      {tokens.length > 0 && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5" aria-label="Input tokens">
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Input</span>
          <ol className="flex flex-wrap gap-1 font-mono text-xs">
            {tokens.map((t, i) => (
              <li
                key={i}
                className={cn(
                  "rounded border px-1.5",
                  t.state === "consumed" && "border-transparent text-muted-foreground line-through decoration-stdin/60",
                  t.state === "next" && "border-stdin text-stdin underline underline-offset-2",
                  t.state === "pending" && "text-foreground/80",
                )}
                title={t.state === "consumed" ? "Already read" : t.state === "next" ? "Read next" : "Not read yet"}
              >
                {t.text}
              </li>
            ))}
          </ol>
        </div>
      )}
      <pre
        aria-label="Program output"
        aria-live="polite"
        className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap"
      >
        {output || <span className="text-muted-foreground">Nothing printed yet.</span>}
        <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-primary/70" aria-hidden />
      </pre>
    </div>
  );
}
