"use client";

import { HistoryIcon, PencilIcon, PlayIcon, SkipForwardIcon, WandSparklesIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLanguageAdapter } from "@/languages";
import type { LanguageId } from "@/shared/constants";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CodeEditor, StdinInput } from "@/features/editor";
import { ShareButton } from "@/features/snippets";
import { usePlayback, Visualizer } from "@/features/visualizer";
import { useFullscreen } from "../hooks/use-fullscreen";
import { useRun } from "../hooks/use-run";
import { IdleState } from "./idle-state";
import { RunError } from "./run-error";
import { RunningState } from "./running-state";
import { SplitHandle } from "@/components/common/split-handle";
import { ZoomControls } from "@/components/common/zoom-controls";
import { usePersistedNumber } from "@/lib/use-persisted-number";
import { cn } from "@/lib/utils";

type Mode = "auto" | "step";

const CODE_WIDTH = { key: "mcv-code-width", default: 45, min: 20, max: 75 } as const;
/** Code zoom in percent; 100% is a 14px font. */
const CODE_ZOOM = { key: "mcv-code-zoom", default: 100, min: 50, max: 250, baseFontSize: 14 } as const;
/** Editor share of the editor + input column. */
const EDITOR_HEIGHT = { key: "mcv-editor-height", default: 78, min: 25, max: 92 } as const;

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
  // After "Edit code" the last run stays on screen (memory, call tree, flow, output) until the next
  // Visualize or a manual Clear; only the editor is unlocked.
  const [editing, setEditing] = useState(false);
  const hasRun = state.status === "ready" && trace?.status !== "compile_error";
  const viewing = hasRun && !editing;
  const splitRef = useRef<HTMLDivElement>(null);
  const [codeWidth, setCodeWidth] = usePersistedNumber(CODE_WIDTH.key, CODE_WIDTH.default, CODE_WIDTH.min, CODE_WIDTH.max);
  const [codeZoom, setCodeZoom] = usePersistedNumber(CODE_ZOOM.key, CODE_ZOOM.default, CODE_ZOOM.min, CODE_ZOOM.max);
  const editorSplitRef = useRef<HTMLDivElement>(null);
  const [editorHeight, setEditorHeight] = usePersistedNumber(EDITOR_HEIGHT.key, EDITOR_HEIGHT.default, EDITOR_HEIGHT.min, EDITOR_HEIGHT.max);
  const fullscreen = useFullscreen();
  const fullscreenControl = useMemo(() => ({ active: fullscreen.active, toggle: fullscreen.toggle }), [fullscreen.active, fullscreen.toggle]);

  // Read the latest code/input from refs, so a run started right after an edit never uses stale text.
  const codeRef = useRef(initialCode);
  const stdinRef = useRef(initialStdin);
  const updateCode = useCallback((value: string) => {
    codeRef.current = value;
    setCode(value);
  }, []);
  const updateStdin = useCallback((value: string) => {
    stdinRef.current = value;
    setStdin(value);
  }, []);
  const visualize = useCallback(() => {
    setEditing(false);
    void run(language, codeRef.current, stdinRef.current);
  }, [run, language]);
  const exitFullscreen = fullscreen.exit;
  const clear = useCallback(() => {
    setEditing(false);
    void exitFullscreen();
    reset();
  }, [reset, exitFullscreen]);

  useEffect(() => {
    if (autoRun) void run(language, codeRef.current, stdinRef.current);
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
    <div
      ref={splitRef}
      className="grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(20rem,var(--code-width))_auto_minmax(24rem,1fr)]"
      style={{ "--code-width": `${codeWidth}%` } as React.CSSProperties}
    >
      <section aria-label="Code" className="@container flex h-[75dvh] min-h-0 min-w-0 flex-col overflow-hidden border-b lg:h-auto lg:border-b-0">
        {banner}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-mono text-xs text-muted-foreground">{fileName}</span>
            <ZoomControls label="Code" value={codeZoom} onChange={setCodeZoom} min={CODE_ZOOM.min} max={CODE_ZOOM.max} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(v) => (v === "auto" || v === "step") && setMode(v)}
              aria-label="Visualization mode"
            >
              <ToggleGroupItem value="step" aria-label="Step by step">
                <SkipForwardIcon aria-hidden /> <span className="hidden @lg:inline">Step-by-step</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="auto" aria-label="Automated">
                <WandSparklesIcon aria-hidden /> <span className="hidden @lg:inline">Automated</span>
              </ToggleGroupItem>
            </ToggleGroup>
            {viewing ? (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                <PencilIcon /> Edit code
              </Button>
            ) : (
              <Button size="sm" onClick={visualize} disabled={state.status === "running" || code.trim() === ""}>
                <PlayIcon /> Visualize
                <Kbd className="hidden border-primary-foreground/30 bg-transparent text-primary-foreground/80 @md:inline-flex">Ctrl ↵</Kbd>
              </Button>
            )}
            {canShare && <ShareButton language={language} code={code} stdin={stdin} />}
          </div>
        </div>
        <div
          ref={editorSplitRef}
          className="grid min-h-0 flex-1 grid-rows-[minmax(0,var(--editor-height))_auto_minmax(0,1fr)]"
          style={{ "--editor-height": `${editorHeight}%` } as React.CSSProperties}
        >
          <div className="min-h-0 overflow-hidden">
            <CodeEditor
              value={code}
              onChange={updateCode}
              language={adapter.monacoLanguage}
              readOnly={viewing}
              currentLine={viewing ? playback.step?.line : undefined}
              previousLine={viewing ? playback.previousStep?.line : undefined}
              breakpoints={playback.state.breakpoints}
              onToggleBreakpoint={playback.toggleBreakpoint}
              diagnostics={diagnostics}
              revealRequest={reveal}
              fontSize={Math.round((CODE_ZOOM.baseFontSize * codeZoom) / 100)}
            />
          </div>
          <SplitHandle
            containerRef={editorSplitRef}
            direction="column"
            label="Resize input panel"
            value={editorHeight}
            onChange={setEditorHeight}
            min={EDITOR_HEIGHT.min}
            max={EDITOR_HEIGHT.max}
            defaultValue={EDITOR_HEIGHT.default}
          />
          <div className="min-h-0 overflow-hidden">
            <StdinInput value={stdin} onChange={updateStdin} disabled={viewing} />
          </div>
        </div>
      </section>

      <SplitHandle
        containerRef={splitRef}
        label="Resize code panel"
        className="hidden lg:flex"
        value={codeWidth}
        onChange={setCodeWidth}
        min={CODE_WIDTH.min}
        max={CODE_WIDTH.max}
        defaultValue={CODE_WIDTH.default}
      />

      <section
        aria-label="Visualization"
        className={cn(
          "flex h-[90dvh] min-h-0 min-w-0 flex-col overflow-hidden bg-background lg:h-auto",
          fullscreen.active && "fixed inset-0 z-50 h-dvh bg-background lg:h-dvh",
        )}
      >
        {state.status === "idle" && <IdleState />}
        {state.status === "running" && <RunningState />}
        {state.status === "error" && <RunError error={state.error} onRetry={visualize} />}
        {state.status === "ready" && editing && (
          <p role="status" className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <HistoryIcon className="size-3.5 shrink-0" aria-hidden />
            Showing your last run. Edit the code, then press Visualize to run it again.
          </p>
        )}
        {state.status === "ready" && (
          <Visualizer
            language={language}
            trace={state.trace}
            source={state.source}
            stdin={state.stdin}
            playback={playback}
            onSelectLine={(line) => setReveal({ line, nonce: Date.now() })}
            fullscreen={fullscreenControl}
            onClear={clear}
          />
        )}
      </section>
    </div>
  );
}
