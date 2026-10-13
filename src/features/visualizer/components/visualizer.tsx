"use client";

import {
  BrainIcon,
  ChevronDownIcon,
  EraserIcon,
  Maximize2Icon,
  Minimize2Icon,
  NetworkIcon,
  ScrollTextIcon,
  SwatchBookIcon,
  WorkflowIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCodeExplanation } from "@/features/explanation";
import { getLanguageAdapter } from "@/languages";
import type { LanguageId } from "@/shared/constants";
import type { Trace } from "@/shared/trace";
import { InfoTip } from "@/components/common/info-tip";
import { SplitHandle } from "@/components/common/split-handle";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePersistedNumber } from "@/lib/use-persisted-number";
import { cn } from "@/lib/utils";
import type { PlaybackController } from "../hooks/use-playback";
import { usePlaybackShortcuts } from "../hooks/use-playback-shortcuts";
import { useStepNarration } from "../hooks/use-step-narration";
import { EXPLAIN } from "../lib/explanations";
import { firstVisits, narrationClips } from "../lib/narration-script";
import { buildCallTimeline, returnedCallLabel } from "../lib/call-timeline";
import { describeStep } from "../lib/step-notes";
import { stdoutAt } from "../lib/trace-helpers";
import { CallTree, CallTreeLegend } from "./call-tree";
import { CompileErrors } from "./compile-errors";
import { ConsolePanel } from "./console-panel";
import { FlowLegend, FlowView } from "./flow-view";
import { MemoryLegend, MemoryView } from "./memory-view";
import { IconToggle } from "./icon-toggle";
import { NarrationToggle, TranscriptToggle } from "./narration-toggle";
import { PlaybackBar } from "./playback-bar";
import { StatusBanner } from "./status-banner";
import { StepNoteBar } from "./step-note-bar";
import { TranscriptLine } from "./transcript-line";

/** Tabs (memory, flow, call tree) share of the tabs + step note + input/output area. */
const TABS_HEIGHT = { key: "mcv-tabs-height", default: 75, min: 25, max: 90 } as const;

/** Step details (the notes for each step) open under the player; closed by default. */
const STEPS_OPEN = { key: "mcv-steps-open", default: 0, min: 0, max: 1 } as const;
/** Collapsed: only the player's top row shows (and, outside full screen, the diagram). */
const PLAYER_COLLAPSED = { key: "mcv-player-collapsed", default: 0, min: 0, max: 1 } as const;
/** One-line transcript above input and output; shown by default. */
const TRANSCRIPT_ON = { key: "mcv-transcript", default: 1, min: 0, max: 1 } as const;
/** The memory legend along the bottom; shown by default. */
const LEGEND_ON = { key: "mcv-legend", default: 1, min: 0, max: 1 } as const;

/** Full screen: width of the floating card (player, notes, input/output) over the diagram canvas. */
const FULLSCREEN_CARD_WIDTH = "max(28rem, 42%)";

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
  /** AI line-by-line explanations are set up on the server. */
  canExplain?: boolean;
  /** Example title and description, given to the AI as context. */
  explainContext?: { title: string; description: string };
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
  canExplain = false,
  explainContext,
}: VisualizerProps) {
  const adapter = getLanguageAdapter(language);
  const sourceLines = useMemo(() => source.split("\n"), [source]);
  const { step, previousStep, state, total } = playback;
  usePlaybackShortcuts(playback, trace.steps.length > 0, fullscreen?.toggle);
  const [tab, setTab] = useState<Tab>("memory");
  const [stepsOpenValue, setStepsOpen] = usePersistedNumber(
    STEPS_OPEN.key,
    STEPS_OPEN.default,
    STEPS_OPEN.min,
    STEPS_OPEN.max,
  );
  const stepsOpen = stepsOpenValue === 1;
  const [collapsedValue, setCollapsed] = usePersistedNumber(
    PLAYER_COLLAPSED.key,
    PLAYER_COLLAPSED.default,
    PLAYER_COLLAPSED.min,
    PLAYER_COLLAPSED.max,
  );
  const collapsed = collapsedValue === 1;
  const [transcriptValue, setTranscript] = usePersistedNumber(
    TRANSCRIPT_ON.key,
    TRANSCRIPT_ON.default,
    TRANSCRIPT_ON.min,
    TRANSCRIPT_ON.max,
  );
  const transcriptOn = transcriptValue === 1 && (canNarrate || canExplain);
  const [legendValue, setLegend] = usePersistedNumber(
    LEGEND_ON.key,
    LEGEND_ON.default,
    LEGEND_ON.min,
    LEGEND_ON.max,
  );
  const legendOn = legendValue === 1;
  const splitRef = useRef<HTMLDivElement>(null);
  // Full screen: how much of the canvas the floating card covers, so diagrams start beside it.
  const [card, setCard] = useState<HTMLElement | null>(null);
  const [cardCover, setCardCover] = useState(0);
  useEffect(() => {
    if (!card) return;
    const measure = () => setCardCover(card.offsetLeft + card.offsetWidth + 12);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, [card]);
  const insetLeft = fullscreen?.active ? cardCover : 0;
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

  const explanationState = useCodeExplanation(
    useMemo(
      () =>
        canExplain && trace.status !== "compile_error"
          ? { language, code: source, stdin, ...(explainContext && { context: explainContext }) }
          : null,
      [canExplain, trace.status, language, source, stdin, explainContext],
    ),
  );
  const explanation = explanationState.status === "ready" ? explanationState.explanation : undefined;
  const timeline = useMemo(() => buildCallTimeline(trace), [trace]);
  const returnedCall = returnedCallLabel(timeline, previousStep, step);
  const firstVisitOf = useMemo(() => firstVisits(trace.steps.map((s) => s.line)), [trace]);
  const upcomingLine = (index: number) => {
    const s = trace.steps[index];
    return s && s.event !== "end" && s.event !== "exception" ? s.line : undefined;
  };
  const currentLineExplanation = (() => {
    const line = upcomingLine(state.index);
    const entry = line === undefined ? undefined : explanation?.lines.find((l) => l.line === line);
    if (!entry || line === undefined) return undefined;
    return firstVisitOf.get(line) === state.index ? entry.explain : entry.brief;
  })();

  const [narrating, setNarrating] = useState(false);
  const [narrationError, setNarrationError] = useState<string>();
  const scriptFor = useCallback(
    (index: number) => {
      const s = trace.steps[index];
      if (!s) return [];
      const nextLine = s.event !== "end" && s.event !== "exception" ? s.line : undefined;
      return narrationClips({
        notes: describeStep({ trace, index, sourceLines, stdin, explainException: adapter.explainException }),
        nextLine,
        firstVisit: nextLine !== undefined && firstVisitOf.get(nextLine) === index,
        explanation,
      });
    },
    [trace, sourceLines, stdin, adapter, firstVisitOf, explanation],
  );
  const onNarrationError = useCallback((message: string) => {
    setNarrating(false);
    setNarrationError(message);
  }, []);
  useStepNarration({
    enabled: canNarrate && narrating && trace.status !== "compile_error",
    trace,
    playback,
    scriptFor,
    // With an AI explanation, examples are introduced by their title and the AI's summary; without
    // one (Groq missing, slow or failing) by their written description.
    intro: explanation
      ? explainContext
        ? `${explainContext.title}. ${explanation.summary}`
        : explanation.summary
      : narrationIntro,
    ready: explanationState.status !== "loading",
    onError: onNarrationError,
  });

  // When the program has ended the stack is empty, so keep showing memory as it was at the last line that ran.
  const finished = step?.event === "end";
  // What the transcript shows when the voice is quiet: the AI's words for this moment. Without them
  // it falls back to the step notes, but only while step details are closed (no duplicate text).
  const transcriptText =
    (state.index === 0 ? explanation?.summary : undefined) ??
    (finished ? explanation?.closing : undefined) ??
    currentLineExplanation ??
    (stepsOpen ? "" : notes.map((n) => n.text).join(" "));
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

  const playerEl = (
    <PlaybackBar
      playback={playback}
      trailing={
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={collapsed ? "Expand player" : "Collapse player"}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed(collapsed ? 0 : 1)}
            >
              <ChevronDownIcon
                className={cn("transition-transform duration-200", !collapsed && "rotate-180")}
                aria-hidden
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {collapsed ? "Show everything again" : "Collapse to just the player"}
          </TooltipContent>
        </Tooltip>
      }
    />
  );
  const stepDetailsEl = (
    <>
      {stepsOpen ? (
        <div id="step-details" className="mcv-fade-in">
          <StepNoteBar
            className={fullscreen?.active ? "max-h-none border-b-0" : undefined}
            notes={notes}
            stepNumber={state.index + 1}
            total={total}
            line={step && step.event !== "end" ? step.line : undefined}
            lineText={step && step.event !== "end" ? sourceLines[step.line - 1]?.trim() : undefined}
            ai={
              explanationState.status === "off"
                ? undefined
                : {
                    loading: explanationState.status === "loading",
                    error: explanationState.status === "error" ? explanationState.message : undefined,
                    lineText: transcriptOn ? undefined : currentLineExplanation,
                    summary: state.index === 0 ? explanation?.summary : undefined,
                    insights: finished ? explanation?.keyInsights : undefined,
                    closing: finished ? explanation?.closing : undefined,
                  }
            }
          />
        </div>
      ) : (
        // Closed, the step notes are still announced to screen readers.
        <p id="step-details" aria-live="polite" aria-atomic="true" className="sr-only">
          {notes.map((n) => n.text).join(" ")}
        </p>
      )}
    </>
  );
  const bannerEl = (
    <StatusBanner
      trace={trace}
      step={step}
      isLastStep={state.index >= total - 1}
      explainException={adapter.explainException}
    />
  );
  const toolbarEl = (
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
            preparing={narrating && explanationState.status === "loading"}
            error={narrationError}
            onToggle={() => {
              setNarrationError(undefined);
              setNarrating((v) => !v);
            }}
          />
        )}
        {(canNarrate || canExplain) && (
          <TranscriptToggle shown={transcriptOn} onToggle={() => setTranscript(transcriptOn ? 0 : 1)} />
        )}
        <IconToggle
          label="Step details"
          pressed={stepsOpen}
          onToggle={() => setStepsOpen(stepsOpen ? 0 : 1)}
          icon={<ScrollTextIcon aria-hidden />}
          hint={stepsOpen ? "Hide step details" : "Show step details: the line and what this step did"}
        />
        <IconToggle
          label="Legend"
          pressed={legendOn}
          onToggle={() => setLegend(legendOn ? 0 : 1)}
          icon={<SwatchBookIcon aria-hidden />}
          hint={legendOn ? "Hide the legend" : "Show the legend: how to read this diagram"}
        />
        {onClear && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Clear visualization">
                <EraserIcon />
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
  );
  const diagramsEl = (
    <>
      <TabsContent value="memory" className="min-h-0 flex-1">
        {finished && memoryStep ? (
          <MemoryView step={memoryStep} previousStep={memoryStep} finished insetLeft={insetLeft} />
        ) : (
          <MemoryView
            step={step}
            previousStep={previousStep}
            returnedCall={returnedCall}
            insetLeft={insetLeft}
          />
        )}
      </TabsContent>
      <TabsContent value="flow" className="min-h-0 flex-1">
        <FlowView
          trace={trace}
          sourceLines={sourceLines}
          index={state.index}
          onSeek={playback.seek}
          insetLeft={insetLeft}
        />
      </TabsContent>
      <TabsContent value="calls" className="min-h-0 flex-1">
        <CallTree trace={trace} index={state.index} onSeek={playback.seek} insetLeft={insetLeft} />
      </TabsContent>
    </>
  );
  const lowerEl = (
    <>
      {transcriptOn && <TranscriptLine text={transcriptText} narrating={canNarrate && narrating} />}
      <div className="min-h-0 flex-1 overflow-hidden">
        <ConsolePanel
          output={stdoutAt(trace, step)}
          previousOutput={stdoutAt(trace, previousStep)}
          stdin={stdin}
          stdinConsumed={step?.stdinConsumed ?? 0}
        />
      </div>
    </>
  );
  const LEGENDS = { memory: MemoryLegend, flow: FlowLegend, calls: CallTreeLegend } as const;
  const TabLegend = LEGENDS[tab];
  const legendEl = legendOn ? <TabLegend /> : null;
  const tabsProps = { value: tab, onValueChange: (v: string) => isTab(v) && setTab(v) };

  // Collapsed, the step notes still reach screen readers.
  const srNotesEl = (
    <p aria-live="polite" aria-atomic="true" className="sr-only">
      {notes.map((n) => n.text).join(" ")}
    </p>
  );

  if (fullscreen?.active) {
    // Full screen: the diagram fills the whole canvas (legend along its bottom), and everything else
    // lives in a card floating over the top left, at most half the screen tall. Diagram content
    // starts beside the card, never under it.
    return (
      <Tabs
        {...tabsProps}
        className="bg-background relative h-full min-h-0 overflow-hidden"
        style={{ "--card-width": FULLSCREEN_CARD_WIDTH } as React.CSSProperties}
      >
        <div className="absolute inset-0 flex min-h-0 flex-col">
          {diagramsEl}
          {legendEl}
        </div>
        <aside
          ref={setCard}
          aria-label="Player and details"
          className="mcv-pop-in glass ring-foreground/5 absolute top-3 left-3 z-20 flex max-h-[calc(50%-0.75rem)] w-(--card-width) min-w-0 flex-col overflow-hidden rounded-2xl border shadow-2xl ring-1 shadow-black/30"
        >
          {playerEl}
          {collapsed ? (
            srNotesEl
          ) : (
            <>
              {bannerEl}
              {toolbarEl}
              {/* At most half the screen tall: step details scroll when space runs out; input and
                  output keep a compact, fixed height. */}
              <div className="min-h-0 overflow-auto">{stepDetailsEl}</div>
              <div className="flex h-44 shrink-0 flex-col overflow-hidden border-t">{lowerEl}</div>
            </>
          )}
        </aside>
      </Tabs>
    );
  }

  if (collapsed) {
    // Collapsed: just the player's top row, and the diagram filling the rest.
    return (
      <Tabs {...tabsProps} className="flex h-full min-h-0 flex-col">
        {playerEl}
        {srNotesEl}
        {diagramsEl}
      </Tabs>
    );
  }

  return (
    <Tabs {...tabsProps} className="flex h-full min-h-0 flex-col">
      {playerEl}
      {stepDetailsEl}
      {bannerEl}
      <div
        ref={splitRef}
        className="grid min-h-0 flex-1 grid-rows-[minmax(0,var(--tabs-height))_auto_minmax(0,1fr)]"
        style={{ "--tabs-height": `${tabsHeight}%` } as React.CSSProperties}
      >
        <div className="flex min-h-0 flex-col overflow-hidden">
          {toolbarEl}
          {diagramsEl}
        </div>
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
        <div className="flex min-h-0 flex-col overflow-hidden">{lowerEl}</div>
      </div>
      {legendEl}
    </Tabs>
  );
}
