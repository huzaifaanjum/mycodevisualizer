"use client";

import { KeyboardIcon, TerminalIcon } from "lucide-react";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { InfoTip } from "@/components/common/info-tip";
import { SplitHandle } from "@/components/common/split-handle";
import { cn } from "@/lib/utils";
import { usePersistedNumber } from "@/lib/use-persisted-number";
import { EXPLAIN, type Explanation } from "../lib/explanations";
import { stdinTokens } from "../lib/trace-helpers";

/** Input share of the input + output row. */
const INPUT_WIDTH = { key: "mcv-io-width", default: 40, min: 15, max: 85 } as const;

/**
 * Input on the left (the "tape" showing what Scanner has read), output on the right, with a
 * draggable divider between them. Output printed by the current step is highlighted.
 */
export function ConsolePanel({
  output,
  previousOutput,
  stdin,
  stdinConsumed,
}: {
  output: string;
  /** Output before this step; whatever was added since is highlighted as new. */
  previousOutput: string;
  stdin: string;
  stdinConsumed: number;
}) {
  const splitRef = useRef<HTMLDivElement>(null);
  const [inputWidth, setInputWidth] = usePersistedNumber(
    INPUT_WIDTH.key,
    INPUT_WIDTH.default,
    INPUT_WIDTH.min,
    INPUT_WIDTH.max,
  );
  const tokens = stdinTokens(stdin, stdinConsumed);
  const read = tokens.filter((t) => t.state === "consumed").length;
  const isNew = output.length > previousOutput.length && output.startsWith(previousOutput);
  const kept = isNew ? previousOutput : output;
  const added = isNew ? output.slice(previousOutput.length) : "";

  return (
    <div
      ref={splitRef}
      className="grid h-full min-h-0 grid-cols-[minmax(0,var(--input-width))_auto_minmax(0,1fr)]"
      style={{ "--input-width": `${inputWidth}%` } as CSSProperties}
    >
      <Pane
        icon={<KeyboardIcon aria-hidden />}
        info={EXPLAIN.input}
        meta={tokens.length > 0 ? `${read} of ${tokens.length} read` : undefined}
      >
        {tokens.length === 0 ? (
          <p className="text-muted-foreground text-xs">This run had no input.</p>
        ) : (
          <ol aria-label="Input tokens" className="flex flex-wrap gap-1.5 font-mono text-xs">
            {tokens.map((t, i) => (
              <li
                key={i}
                className={cn(
                  "rounded-md border px-1.5 py-0.5 transition-colors",
                  t.state === "consumed" &&
                    "bg-muted/60 text-muted-foreground decoration-stdin/60 border-transparent line-through",
                  t.state === "next" && "border-stdin bg-stdin/10 text-stdin underline underline-offset-2",
                  t.state === "pending" && "bg-card text-foreground/80",
                )}
                title={
                  t.state === "consumed" ? "Already read" : t.state === "next" ? "Read next" : "Not read yet"
                }
              >
                {t.text}
              </li>
            ))}
          </ol>
        )}
      </Pane>
      <SplitHandle
        containerRef={splitRef}
        label="Resize input and output"
        value={inputWidth}
        onChange={setInputWidth}
        min={INPUT_WIDTH.min}
        max={INPUT_WIDTH.max}
        defaultValue={INPUT_WIDTH.default}
      />
      <Pane
        icon={<TerminalIcon aria-hidden />}
        info={EXPLAIN.output}
        meta={
          added ? (
            <span className="bg-changed/15 text-changed rounded-full px-1.5">new output</span>
          ) : undefined
        }
      >
        <pre
          aria-label="Program output"
          aria-live="polite"
          className="font-mono text-xs leading-relaxed whitespace-pre-wrap"
        >
          {output ? (
            <>
              {kept}
              {added && (
                <mark key={output.length} className="mcv-fade-in bg-changed/20 rounded-sm text-inherit">
                  {added}
                </mark>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">Nothing printed yet.</span>
          )}
          <span
            className="bg-primary/70 ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse"
            aria-hidden
          />
        </pre>
      </Pane>
    </div>
  );
}

function Pane({
  icon,
  info,
  meta,
  children,
}: {
  icon: ReactNode;
  info: Explanation;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={info.title} className="flex min-h-0 min-w-0 flex-col">
      <header className="[&>svg]:text-muted-foreground flex h-9 shrink-0 items-center gap-1.5 border-b px-3 text-xs font-medium [&>svg]:size-3.5">
        {icon}
        {info.title}
        <InfoTip title={info.title} text={info.text} />
        {meta && (
          <span className="text-muted-foreground ml-auto truncate text-[11px] font-normal">{meta}</span>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-2.5">{children}</div>
    </section>
  );
}
