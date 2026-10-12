"use client";

import { BrainIcon, Maximize2Icon, Minimize2Icon, NetworkIcon, WorkflowIcon } from "lucide-react";
import { useMemo } from "react";
import { getLanguageAdapter } from "@/languages";
import type { LanguageId } from "@/shared/constants";
import type { Trace } from "@/shared/trace";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

export interface VisualizerProps {
  language: LanguageId;
  trace: Trace;
  source: string;
  stdin: string;
  playback: PlaybackController;
  onSelectLine?: (line: number) => void;
  /** Full-screen control owned by the page; the button and the F shortcut live here. */
  fullscreen?: { active: boolean; toggle: () => void };
}

/** The right-hand panel: step notes, memory, call tree, console and playback for one trace. */
export function Visualizer({ language, trace, source, stdin, playback, onSelectLine, fullscreen }: VisualizerProps) {
  const adapter = getLanguageAdapter(language);
  const sourceLines = useMemo(() => source.split("\n"), [source]);
  const { step, previousStep, state, total } = playback;
  usePlaybackShortcuts(playback, trace.steps.length > 0, fullscreen?.toggle);

  const notes = useMemo(
    () => describeStep({ trace, index: state.index, sourceLines, stdin, explainException: adapter.explainException }),
    [trace, state.index, sourceLines, stdin, adapter],
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
      <Tabs defaultValue="memory" className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-3 pt-2">
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
        <TabsContent value="memory" className="min-h-0 flex-1">
          <MemoryView step={step} previousStep={previousStep} />
        </TabsContent>
        <TabsContent value="calls" className="min-h-0 flex-1">
          <CallTree trace={trace} index={state.index} />
        </TabsContent>
        <TabsContent value="flow" className="min-h-0 flex-1">
          <FlowView trace={trace} sourceLines={sourceLines} index={state.index} />
        </TabsContent>
      </Tabs>
      <div className="h-36 shrink-0 border-t">
        <ConsolePanel output={stdoutAt(trace, step)} stdin={stdin} stdinConsumed={step?.stdinConsumed ?? 0} />
      </div>
      <PlaybackBar playback={playback} />
    </div>
  );
}
