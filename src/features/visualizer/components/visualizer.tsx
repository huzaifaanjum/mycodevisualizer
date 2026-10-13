"use client";

import { BrainIcon, EraserIcon, Maximize2Icon, Minimize2Icon, NetworkIcon, WorkflowIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { getLanguageAdapter } from "@/languages";
import type { LanguageId } from "@/shared/constants";
import type { Trace } from "@/shared/trace";
import { SplitHandle } from "@/components/common/split-handle";
import { ZoomControls } from "@/components/common/zoom-controls";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePersistedNumber } from "@/lib/use-persisted-number";
import type { PlaybackController } from "../hooks/use-playback";
import { usePlaybackShortcuts } from "../hooks/use-playback-shortcuts";
import { describeStep } from "../lib/step-notes";
import { stdoutAt } from "../lib/trace-helpers";
import { CallTree } from "./call-tree";
import { CompileErrors } from "./compile-errors";
import { ConsolePanel } from "./console-panel";
import { FlowView } from "./flow-view";
import { MemoryView } from "./memory-view";
import { PlaybackBar } from "./playback-bar";
import { StatusBanner } from "./status-banner";
import { StepNoteBar } from "./step-note-bar";

/** Tabs (memory, call tree, flow) share of the tabs + console area. */
const TABS_HEIGHT = { key: "mcv-tabs-height", default: 75, min: 25, max: 92 } as const;

/** Memory and call tree zoom in percent. The flow tab has its own pan/zoom. */
const VIZ_ZOOM = { key: "mcv-viz-zoom", default: 100, min: 50, max: 250 } as const;

type Tab = "memory" | "calls" | "flow";
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
}

/** The right-hand panel: step notes, memory, call tree, console and playback for one trace. */
export function Visualizer({ language, trace, source, stdin, playback, onSelectLine, fullscreen, onClear }: VisualizerProps) {
  const adapter = getLanguageAdapter(language);
  const sourceLines = useMemo(() => source.split("\n"), [source]);
  const { step, previousStep, state, total } = playback;
  usePlaybackShortcuts(playback, trace.steps.length > 0, fullscreen?.toggle);
  const [tab, setTab] = useState<Tab>("memory");
  const [zoom, setZoom] = usePersistedNumber(VIZ_ZOOM.key, VIZ_ZOOM.default, VIZ_ZOOM.min, VIZ_ZOOM.max);
  const splitRef = useRef<HTMLDivElement>(null);
  const [tabsHeight, setTabsHeight] = usePersistedNumber(TABS_HEIGHT.key, TABS_HEIGHT.default, TABS_HEIGHT.min, TABS_HEIGHT.max);

  const notes = useMemo(
    () => describeStep({ trace, index: state.index, sourceLines, stdin, explainException: adapter.explainException }),
    [trace, state.index, sourceLines, stdin, adapter],
  );

  // When the program has ended the stack is empty, so keep showing memory as it was at the last line that ran.
  const finished = step?.event === "end";
  const memoryStep = useMemo(
    () => (finished ? trace.steps.findLast((s) => s.event !== "end" && s.frames.length > 0) : undefined),
    [finished, trace],
  );

  if (trace.status === "compile_error") {
    return <CompileErrors diagnostics={trace.diagnostics ?? []} explain={adapter.explainDiagnostic} onSelectLine={onSelectLine} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <StatusBanner trace={trace} step={step} isLastStep={state.index >= total - 1} explainException={adapter.explainException} />
      <StepNoteBar
        notes={notes}
        stepNumber={state.index + 1}
        total={total}
        line={step && step.event !== "end" ? step.line : undefined}
        lineText={step && step.event !== "end" ? sourceLines[step.line - 1]?.trim() : undefined}
      />
      <div
        ref={splitRef}
        className="grid min-h-0 flex-1 grid-rows-[minmax(0,var(--tabs-height))_auto_minmax(0,1fr)]"
        style={{ "--tabs-height": `${tabsHeight}%` } as React.CSSProperties}
      >
        <Tabs value={tab} onValueChange={(v) => isTab(v) && setTab(v)} className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-2">
            <TabsList>
              <TabsTrigger value="memory">
                <BrainIcon aria-hidden /> Memory
              </TabsTrigger>
              <TabsTrigger value="calls">
                <NetworkIcon aria-hidden /> Call tree
              </TabsTrigger>
              <TabsTrigger value="flow">
                <WorkflowIcon aria-hidden /> Flow
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-1">
              {tab !== "flow" && <ZoomControls label="Visualization" value={zoom} onChange={setZoom} min={VIZ_ZOOM.min} max={VIZ_ZOOM.max} />}
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
          <TabsContent value="calls" className="min-h-0 flex-1">
            <CallTree trace={trace} index={state.index} onSeek={playback.seek} zoom={zoom} />
          </TabsContent>
          <TabsContent value="flow" className="min-h-0 flex-1">
            <FlowView trace={trace} sourceLines={sourceLines} index={state.index} onSeek={playback.seek} />
          </TabsContent>
        </Tabs>
        <SplitHandle
          containerRef={splitRef}
          direction="column"
          label="Resize output panel"
          value={tabsHeight}
          onChange={setTabsHeight}
          min={TABS_HEIGHT.min}
          max={TABS_HEIGHT.max}
          defaultValue={TABS_HEIGHT.default}
        />
        <div className="min-h-0 overflow-hidden">
          <ConsolePanel output={stdoutAt(trace, step)} stdin={stdin} stdinConsumed={step?.stdinConsumed ?? 0} />
        </div>
      </div>
      <PlaybackBar playback={playback} />
    </div>
  );
}
