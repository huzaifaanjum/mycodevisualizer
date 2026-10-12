"use client";

import { PencilIcon, PlayIcon, SkipForwardIcon, WandSparklesIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getLanguageAdapter } from "@/languages";
import type { LanguageId } from "@/shared/constants";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CodeEditor, StdinInput } from "@/features/editor";
import { ShareButton } from "@/features/snippets";
import { usePlayback, Visualizer } from "@/features/visualizer";
import { useRun } from "../hooks/use-run";
import { IdleState } from "./idle-state";
import { RunError } from "./run-error";
import { RunningState } from "./running-state";

type Mode = "auto" | "step";

export interface WorkspaceProps {
  language: LanguageId;
  initialCode: string;
  initialStdin: string;
  title?: string;
  canShare: boolean;
  /** Run immediately on load (used by shared links and examples). */
  autoRun?: boolean;
  banner?: React.ReactNode;
}

/** Editor + input on the left, visualization on the right. Owns run and playback state. */
export function Workspace({ language, initialCode, initialStdin, title, canShare, autoRun = false, banner }: WorkspaceProps) {
  const adapter = getLanguageAdapter(language);
  const [code, setCode] = useState(initialCode);
  const [stdin, setStdin] = useState(initialStdin);
  const [mode, setMode] = useState<Mode>("step");
  const [reveal, setReveal] = useState<{ line: number; nonce: number }>();
  const { state, run, reset } = useRun();
  const trace = state.status === "ready" ? state.trace : null;
  const playback = usePlayback(trace, mode === "auto");
  const viewing = state.status === "ready" && trace?.status !== "compile_error";

  const visualize = useCallback(() => void run(language, code, stdin), [run, language, code, stdin]);

  useEffect(() => {
    if (autoRun) visualize();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on first load
  }, []);

  // Ctrl/Cmd + Enter visualizes from anywhere, including inside the editor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        visualize();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [visualize]);

  const diagnostics = useMemo(() => (trace?.status === "compile_error" ? trace.diagnostics : undefined), [trace]);
  const fileName = title ?? `${/public\s+class\s+(\w+)/.exec(code)?.[1] ?? "Main"}.java`;

  return (
    <div className="grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(0,9fr)_minmax(0,11fr)]">
      <section aria-label="Code" className="flex h-[75dvh] min-h-0 flex-col border-b lg:h-auto lg:border-r lg:border-b-0">
        {banner}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <span className="truncate font-mono text-xs text-muted-foreground">{fileName}</span>
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(v) => (v === "auto" || v === "step") && setMode(v)}
              aria-label="Visualization mode"
            >
              <ToggleGroupItem value="step" aria-label="Step by step">
                <SkipForwardIcon aria-hidden /> Step-by-step
              </ToggleGroupItem>
              <ToggleGroupItem value="auto" aria-label="Automated">
                <WandSparklesIcon aria-hidden /> Automated
              </ToggleGroupItem>
            </ToggleGroup>
            {viewing ? (
              <Button size="sm" variant="secondary" onClick={reset}>
                <PencilIcon /> Edit code
              </Button>
            ) : (
              <Button size="sm" onClick={visualize} disabled={state.status === "running" || code.trim() === ""}>
                <PlayIcon /> Visualize
                <Kbd className="hidden border-primary-foreground/30 bg-transparent text-primary-foreground/80 sm:inline-flex">Ctrl ↵</Kbd>
              </Button>
            )}
            {canShare && <ShareButton language={language} code={code} stdin={stdin} />}
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <CodeEditor
            value={code}
            onChange={setCode}
            language={adapter.monacoLanguage}
            readOnly={viewing}
            currentLine={viewing ? playback.step?.line : undefined}
            previousLine={viewing ? playback.previousStep?.line : undefined}
            breakpoints={playback.state.breakpoints}
            onToggleBreakpoint={playback.toggleBreakpoint}
            diagnostics={diagnostics}
            revealRequest={reveal}
          />
        </div>
        <div className="h-36 shrink-0 border-t">
          <StdinInput value={stdin} onChange={setStdin} disabled={viewing} />
        </div>
      </section>

      <section aria-label="Visualization" className="flex h-[90dvh] min-h-0 flex-col lg:h-auto">
        {state.status === "idle" && <IdleState />}
        {state.status === "running" && <RunningState />}
        {state.status === "error" && <RunError error={state.error} onRetry={visualize} />}
        {state.status === "ready" && (
          <Visualizer
            language={language}
            trace={state.trace}
            source={state.source}
            stdin={state.stdin}
            playback={playback}
            onSelectLine={(line) => setReveal({ line, nonce: Date.now() })}
          />
        )}
      </section>
    </div>
  );
}
