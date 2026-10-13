"use client";

import { BrainIcon, EraserIcon, Maximize2Icon, Minimize2Icon, NetworkIcon, WorkflowIcon } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { getLanguageAdapter } from "@/languages";
import type { LanguageId } from "@/shared/constants";
import type { Trace } from "@/shared/trace";
import { InfoTip } from "@/components/common/info-tip";
import { SplitHandle } from "@/components/common/split-handle";
import { ZoomControls } from "@/components/common/zoom-controls";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePersistedNumber } from "@/lib/use-persisted-number";
import type { PlaybackController } from "../hooks/use-playback";
import { usePlaybackShortcuts } from "../hooks/use-playback-shortcuts";
import { useStepNarration } from "../hooks/use-step-narration";
import { EXPLAIN } from "../lib/explanations";
import { spokenStep } from "../lib/narration-script";
import { describeStep } from "../lib/step-notes";
import { stdoutAt } from "../lib/trace-helpers";
import { CallTree } from "./call-tree";
import { CompileErrors } from "./compile-errors";
import { ConsolePanel } from "./console-panel";
import { FlowView } from "./flow-view";
import { MemoryLegend, MemoryView } from "./memory-view";
import { NarrationToggle } from "./narration-toggle";
import { PlaybackBar } from "./playback-bar";
import { StatusBanner } from "./status-banner";
import { StepNoteBar } from "./step-note-bar";

/** Tabs (memory, flow, call tree) share of the tabs + step note + input/output area. */
const TABS_HEIGHT = { key: "mcv-tabs-height", default: 65, min: 25, max: 88 } as const;

/** Memory and call tree zoom in percent. The flow tab has its own pan/zoom. */
const VIZ_ZOOM = { key: "mcv-viz-zoom", default: 100, min: 50, max: 250 } as const;

type Tab = "memory" | "flow" | "calls";

const TAB_INFO = { memory: EXPLAIN.memoryTab, flow: EXPLAIN.flowTab, calls: EXPLAIN.callsTab } as const;
const isTab = (v: string): v is Tab => v === "memory" || v === "calls" || v === "flow";

export interface VisualizerProps {
  language: LanguageId;
  trace: Trace;
  source: string;
  stdin: string;
  playback: PlaybackController;
  onSelectLine?: (line: number) => void;
  /** Full-screen control owned by the page; the button and the F shortcut live here. */
  fullscreen?: { active: boolean; toggle: () => void };
  /** Clears this run (memory, call tree, flow and output) so the panel is empty again. */
  onClear?: () => void;
  /** Voice narration is set up on the server. */
  canNarrate?: boolean;
  /** Read aloud before the first step, e.g. the example's title and description. */
  narrationIntro?: string;
}

/**
 * The right-hand panel for one trace, top to bottom: the player, the views (memory, flow, call
 * tree), the plain-English note for this step, input and output side by side, then the legend.
 */
export function Visualizer({
  language,
  trace,
  source,
  stdin,
  playback,
  onSelectLine,
  fullscreen,
  onClear,
  canNarrate = false,
  narrationIntro,
}: VisualizerProps) {
  const adapter = getLanguageAdapter(language);
  const sourceLines = useMemo(() => source.split("\n"), [source]);
  const { step, previousStep, state, total } = playback;
  usePlaybackShortcuts(playback, trace.steps.length > 0, fullscreen?.toggle);
  const [tab, setTab] = useState<Tab>("memory");
  const [zoom, setZoom] = usePersistedNumber(VIZ_ZOOM.key, VIZ_ZOOM.default, VIZ_ZOOM.min, VIZ_ZOOM.max);
  const splitRef = useRef<HTMLDivElement>(null);
  const [tabsHeight, setTabsHeight] = usePersistedNumber(
    TABS_HEIGHT.key,
    TABS_HEIGHT.default,
    TABS_HEIGHT.min,
    TABS_HEIGHT.max,
  );

  const notes = useMemo(
    () =>
      describeStep({
        trace,
        index: state.index,
        sourceLines,
        stdin,
        explainException: adapter.explainException,
      }),
    [trace, state.index, sourceLines, stdin, adapter],
  );

  const [narrating, setNarrating] = useState(false);
  const [narrationError, setNarrationError] = useState<string>();
  const scriptFor = useCallback(
    (index: number) => {
      if (!trace.steps[index]) return "";
      const stepNotes = describeStep({ trace, index, sourceLines, stdin, explainException: adapter.explainException });
      return spokenStep(stepNotes, trace.steps[index - 1]?.line);
    },
    [trace, sourceLines, stdin, adapter],
  );
  const onNarrationError = useCallback((message: string) => {
    setNarrating(false);
    setNarrationError(message);
  }, []);
  useStepNarration({
    enabled: canNarrate && narrating && trace.status !== "compile_error",
    playback,
    scriptFor,
    intro: narrationIntro,
    onError: onNarrationError,
  });

  // When the program has ended the stack is empty, so keep showing memory as it was at the last line that ran.
  const finished = step?.event === "end";
  const memoryStep = useMemo(
    () => (finished ? trace.steps.findLast((s) => s.event !== "end" && s.frames.length > 0) : undefined),
    [finished, trace],
  );

  if (trace.status === "compile_error") {
    return (
      <CompileErrors
        diagnostics={trace.diagnostics ?? []}
        explain={adapter.explainDiagnostic}
        onSelectLine={onSelectLine}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PlaybackBar playback={playback} />
      <StatusBanner
        trace={trace}
        step={step}
        isLastStep={state.index >= total - 1}
        explainException={adapter.explainException}
      />
      <div
        ref={splitRef}
        className="grid min-h-0 flex-1 grid-rows-[minmax(0,var(--tabs-height))_auto_minmax(0,1fr)]"
        style={{ "--tabs-height": `${tabsHeight}%` } as React.CSSProperties}
      >
        <Tabs
          value={tab}
          onValueChange={(v) => isTab(v) && setTab(v)}
          className="flex min-h-0 flex-col overflow-hidden"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
            <div className="flex items-center gap-2">
              <TabsList>
                <TabsTrigger value="memory">
                  <BrainIcon aria-hidden /> Memory
                </TabsTrigger>
                <TabsTrigger value="flow">
                  <WorkflowIcon aria-hidden /> Flow
                </TabsTrigger>
                <TabsTrigger value="calls">
                  <NetworkIcon aria-hidden /> Call tree
                </TabsTrigger>
              </TabsList>
              <InfoTip title={TAB_INFO[tab].title} text={TAB_INFO[tab].text} />
            </div>
            <div className="flex items-center gap-1">
              {canNarrate && (
                <NarrationToggle
                  enabled={narrating}
                  error={narrationError}
                  onToggle={() => {
                    setNarrationError(undefined);
                    setNarrating((v) => !v);
                  }}
                />
              )}
              {tab !== "flow" && (
                <ZoomControls
                  label="Visualization"
                  value={zoom}
                  onChange={setZoom}
                  min={VIZ_ZOOM.min}
                  max={VIZ_ZOOM.max}
                />
              )}
              {onClear && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={onClear} aria-label="Clear visualization">
                      <EraserIcon /> Clear
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove this run&apos;s memory, call tree, flow and output</TooltipContent>
                </Tooltip>
              )}
              {fullscreen && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={fullscreen.toggle}
                      aria-label={fullscreen.active ? "Exit full screen" : "Full screen"}
                      aria-pressed={fullscreen.active}
                    >
                      {fullscreen.active ? <Minimize2Icon /> : <Maximize2Icon />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {fullscreen.active ? "Exit full screen" : "Full screen"} <Kbd className="ml-1">F</Kbd>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          <TabsContent value="memory" className="min-h-0 flex-1">
            {finished && memoryStep ? (
              <MemoryView step={memoryStep} previousStep={memoryStep} finished zoom={zoom} />
            ) : (
              <MemoryView step={step} previousStep={previousStep} zoom={zoom} />
            )}
          </TabsContent>
          <TabsContent value="flow" className="min-h-0 flex-1">
            <FlowView trace={trace} sourceLines={sourceLines} index={state.index} onSeek={playback.seek} />
          </TabsContent>
          <TabsContent value="calls" className="min-h-0 flex-1">
            <CallTree trace={trace} index={state.index} onSeek={playback.seek} zoom={zoom} />
          </TabsContent>
        </Tabs>
        <SplitHandle
          containerRef={splitRef}
          direction="column"
          label="Resize step and input/output panel"
          value={tabsHeight}
          onChange={setTabsHeight}
          min={TABS_HEIGHT.min}
          max={TABS_HEIGHT.max}
          defaultValue={TABS_HEIGHT.default}
        />
        <div className="flex min-h-0 flex-col overflow-hidden">
          <StepNoteBar
            notes={notes}
            stepNumber={state.index + 1}
            total={total}
            line={step && step.event !== "end" ? step.line : undefined}
            lineText={step && step.event !== "end" ? sourceLines[step.line - 1]?.trim() : undefined}
          />
          <div className="min-h-0 flex-1 overflow-hidden">
            <ConsolePanel
              output={stdoutAt(trace, step)}
              previousOutput={stdoutAt(trace, previousStep)}
              stdin={stdin}
              stdinConsumed={step?.stdinConsumed ?? 0}
            />
          </div>
        </div>
      </div>
      {tab === "memory" && <MemoryLegend />}
    </div>
  );
}
