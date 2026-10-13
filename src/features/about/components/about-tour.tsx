"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  BanIcon,
  BriefcaseIcon,
  CircleCheckIcon,
  CodeXmlIcon,
  CoffeeIcon,
  FileCodeIcon,
  FileTextIcon,
  FootprintsIcon,
  GlobeIcon,
  HourglassIcon,
  KeyboardIcon,
  ListIcon,
  ListOrderedIcon,
  type LucideIcon,
  ShieldCheckIcon,
  SquareTerminalIcon,
  TimerIcon,
} from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CREATOR, SITE, type LanguageId } from "@/shared/constants";
import {
  ABOUT_STEPS,
  LIMIT_ROWS,
  clampStep,
  type AboutStep,
  type LanguageTab,
  type LimitId,
  UPCOMING_LANGUAGES,
  type UpcomingLanguageId,
} from "../lib/about-steps";

const LINK_ICONS: Record<(typeof CREATOR.links)[number]["kind"], LucideIcon> = {
  portfolio: GlobeIcon,
  github: CodeXmlIcon,
  linkedin: BriefcaseIcon,
  resume: FileTextIcon,
};

const LANGUAGE_ICONS: Record<LanguageId, LucideIcon> = {
  java: CoffeeIcon,
};

const UPCOMING_LANGUAGE_ICONS: Record<UpcomingLanguageId, LucideIcon> = {
  python: SquareTerminalIcon,
};

const LIMIT_ICONS: Record<LimitId, LucideIcon> = {
  steps: FootprintsIcon,
  time: TimerIcon,
  code: FileCodeIcon,
  input: KeyboardIcon,
};

/** Renders an icon picked from one of the maps above. */
function MappedIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return <Icon aria-hidden className={className} />;
}

const link = "text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary";

function ChipList({ items, muted = false }: { items: string[]; muted?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className={cn(
            "rounded-full px-3 py-1 text-sm",
            muted ? "bg-muted/40 text-muted-foreground" : "bg-primary/10 text-foreground",
          )}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Classic tabs: a faint baseline with an accent underline under the active tab. */
const TAB_TRIGGER =
  "text-muted-foreground hover:text-foreground data-[state=active]:text-foreground relative h-10 gap-2 rounded-none bg-transparent px-1 text-sm data-[state=active]:bg-transparent after:bg-primary after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:opacity-0 after:transition-opacity after:duration-300 data-[state=active]:after:opacity-100";

function LanguageTabs({ languages }: { languages: LanguageTab[] }) {
  const first = languages[0];
  if (!first) return null;
  return (
    <Tabs defaultValue={first.id}>
      <TabsList
        aria-label="Languages"
        className="h-auto w-full justify-start gap-6 rounded-none bg-transparent p-0 shadow-[inset_0_-1px_0_var(--border)]"
      >
        {languages.map((l) => (
          <TabsTrigger key={l.id} value={l.id} className={TAB_TRIGGER}>
            <MappedIcon icon={LANGUAGE_ICONS[l.id]} className="size-4" />
            {l.name}
          </TabsTrigger>
        ))}
        {UPCOMING_LANGUAGES.map((l) => (
          <TabsTrigger key={l.id} value={l.id} className={TAB_TRIGGER}>
            <MappedIcon icon={UPCOMING_LANGUAGE_ICONS[l.id]} className="size-4" />
            {l.name}
            <span
              aria-hidden
              className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium"
            >
              Soon
            </span>
            <span className="sr-only">(coming soon)</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {languages.map((l) => (
        <TabsContent key={l.id} value={l.id} className="mt-6 space-y-6">
          <p>{l.requirements}</p>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:gap-10">
            <div className="space-y-3">
              <h3 className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                <CircleCheckIcon aria-hidden className="text-primary size-4" />
                You can use
              </h3>
              <ChipList items={l.supported} />
            </div>
            <div className="space-y-3">
              <h3 className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                <BanIcon aria-hidden className="size-4" />
                Not available yet
              </h3>
              <ChipList items={l.notAvailable} muted />
            </div>
          </div>
        </TabsContent>
      ))}
      {UPCOMING_LANGUAGES.map((l) => (
        <TabsContent key={l.id} value={l.id} className="mt-6">
          <div className="bg-muted/40 flex items-start gap-4 rounded-2xl px-5 py-5">
            <HourglassIcon aria-hidden className="text-primary mt-1 size-5 shrink-0" />
            <div className="space-y-1">
              <p className="text-foreground font-medium">Coming soon</p>
              <p className="text-muted-foreground">
                {l.name} support is on the way. Until then, every example and feature works with {first.name}.
              </p>
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** Sections that take a whole row in "Show everything"; the rest sit two per row. */
const FULL_WIDTH_SECTIONS: ReadonlySet<AboutStep["id"]> = new Set(["languages", "creator"]);

/** Marks a link that opens in a new tab, visually and for screen readers. */
function ExternalMark() {
  return (
    <>
      <ArrowUpRightIcon aria-hidden className="size-3.5 shrink-0 opacity-60" />
      <span className="sr-only">(opens in a new tab)</span>
    </>
  );
}

/** The part of a step that isn't plain text: tabs, a table or links. */
function StepDetail({ step, languages }: { step: AboutStep; languages: LanguageTab[] }) {
  switch (step.id) {
    case "languages":
      return <LanguageTabs languages={languages} />;
    case "limits":
      return (
        <div className="@container">
          <dl className="grid grid-cols-2 gap-4 @sm:grid-cols-4 @sm:gap-2 @3xl:gap-4">
            {LIMIT_ROWS.map((r) => (
              <div
                key={r.id}
                className="bg-muted/40 min-w-0 rounded-2xl px-5 py-4 @sm:px-3 @sm:py-3 @3xl:px-5 @3xl:py-4"
              >
                <dt className="text-muted-foreground flex items-center gap-2 text-sm @sm:gap-1.5 @sm:text-xs @3xl:gap-2 @3xl:text-sm">
                  <MappedIcon icon={LIMIT_ICONS[r.id]} className="text-primary size-4 shrink-0" />
                  <span className="truncate">{r.label}</span>
                </dt>
                <dd className="mt-1 text-2xl font-semibold tracking-tight whitespace-nowrap @sm:text-base @lg:text-xl @3xl:text-2xl">
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      );
    case "privacy":
      return (
        <p>
          <Link className={cn(link, "inline-flex items-center gap-1.5")} href="/privacy">
            <ShieldCheckIcon aria-hidden className="size-4 shrink-0" />
            See exactly what is stored
          </Link>
        </p>
      );
    case "creator":
      return (
        <ul className="flex flex-wrap gap-2 pt-2">
          {CREATOR.links.map((l) => {
            const Icon = LINK_ICONS[l.kind];
            return (
              <li key={l.kind}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-border bg-card hover:border-foreground/30 hover:bg-accent inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors"
                >
                  <Icon aria-hidden className="text-muted-foreground size-4" />
                  {l.label}
                  <ExternalMark />
                </a>
              </li>
            );
          })}
        </ul>
      );
    case "source":
      return (
        <p>
          <a
            className={cn(link, "inline-flex items-center gap-1")}
            href={SITE.repository}
            target="_blank"
            rel="noopener noreferrer"
          >
            <CodeXmlIcon aria-hidden className="size-4 shrink-0" />
            View the code on GitHub
            <ExternalMark />
          </a>
        </p>
      );
    case "intro":
    case "why":
    case "how":
      return null;
    default: {
      const unreachable: never = step.id;
      return unreachable;
    }
  }
}

function StepContent({
  step,
  languages,
  large = false,
}: {
  step: AboutStep;
  languages: LanguageTab[];
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        "text-foreground/90 space-y-6",
        large ? "text-base leading-8 sm:text-lg" : "text-[15px] leading-7",
      )}
    >
      {step.id === "creator" && (
        <div className="space-y-1">
          <p
            className={cn(
              "text-foreground leading-tight font-bold tracking-tight",
              large ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl",
            )}
          >
            {CREATOR.name}
          </p>
          <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">{CREATOR.role}</p>
        </div>
      )}
      <div className="max-w-3xl space-y-4 text-justify hyphens-auto">
        {step.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <StepDetail step={step} languages={languages} />
    </div>
  );
}

/** One digit of the big step number. Its slide direction is fixed when it mounts. */
function StepDigit({
  digit,
  direction,
  padding,
}: {
  digit: string;
  direction: "forward" | "back";
  padding: boolean;
}) {
  const [animation] = useState(direction === "forward" ? "mcv-step-forward" : "mcv-step-back");
  return (
    <span className={cn("inline-block", padding ? "text-foreground" : "text-primary", animation)}>
      {digit}
    </span>
  );
}

/** The About page as a short walkthrough: one idea per step, or everything at once. */
export function AboutTour({ languages }: { languages: LanguageTab[] }) {
  const [index, setIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  /** Which way the last move went, so the big step number slides the right way. */
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const last = ABOUT_STEPS.length - 1;
  const step = ABOUT_STEPS[index];
  const next = ABOUT_STEPS[index + 1];

  const goTo = useCallback(
    (to: number) => {
      const target = clampStep(to);
      if (target === index) return;
      setDirection(target > index ? "forward" : "back");
      setIndex(target);
    },
    [index],
  );

  useEffect(() => {
    if (showAll) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target;
      // Leave arrow keys alone inside the language tabs and form fields.
      if (target instanceof HTMLElement && target.closest("[role=tablist], input, textarea, select")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const moves: Record<string, number> = {
        ArrowRight: index + 1,
        ArrowDown: index + 1,
        ArrowLeft: index - 1,
        ArrowUp: index - 1,
        Home: 0,
        End: last,
      };
      const to = moves[e.key];
      if (to === undefined) return;
      e.preventDefault();
      goTo(to);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAll, index, last, goTo]);

  if (!step) return null;

  const toggle = (
    <Button
      variant="ghost"
      size="sm"
      className="px-2"
      onClick={() => setShowAll((v) => !v)}
      aria-pressed={showAll}
    >
      {showAll ? <ListOrderedIcon aria-hidden /> : <ListIcon aria-hidden />}
      {showAll ? "One step at a time" : "Show everything"}
    </Button>
  );

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
      {/* Sidebar: title and step list (step-by-step mode only) */}
      {!showAll && (
        <aside className="flex shrink-0 flex-col gap-8 px-4 pt-5 sm:px-8 lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:w-80 lg:px-6 lg:pt-8 lg:pb-8">
          <div className="flex items-center justify-between gap-3 lg:px-2">
            <h1 className="text-3xl font-semibold tracking-tight">About</h1>
            <div className="lg:hidden">{toggle}</div>
          </div>
          <nav aria-label="About sections" className="hidden lg:block">
            <ol className="relative" style={{ "--step": index } as CSSProperties}>
              {/* Highlight that slides to the current step. */}
              <span
                aria-hidden
                className="bg-accent absolute inset-x-0 top-0 h-12 translate-y-[calc(var(--step)*3rem)] rounded-md transition-transform duration-300 ease-out"
              />
              {/* Rail through every step, filled up to the current one. */}
              <span aria-hidden className="bg-muted absolute top-6 bottom-6 left-[19px] w-0.5 rounded-full" />
              <span
                aria-hidden
                className="bg-primary absolute top-6 left-[19px] h-[calc(var(--step)*3rem)] w-0.5 rounded-full transition-[height] duration-500 ease-out"
              />
              {ABOUT_STEPS.map((s, i) => {
                const done = i < index;
                const current = i === index;
                return (
                  <li key={s.id} className="relative">
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={current ? "step" : undefined}
                      className={cn(
                        "flex h-12 w-full items-center gap-3 rounded-md px-2 text-left text-base transition-colors duration-300",
                        current
                          ? "text-foreground font-medium"
                          : done
                            ? "text-foreground/70 hover:text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span aria-hidden className="flex size-6 shrink-0 items-center justify-center">
                        <span
                          className={cn(
                            "rounded-full transition-all duration-300 ease-out",
                            current
                              ? "bg-primary ring-primary/25 size-3 ring-4"
                              : done
                                ? "bg-primary size-2"
                                : "bg-background ring-muted-foreground/40 size-2 ring-1",
                          )}
                        />
                      </span>
                      {s.title}
                      {done && <span className="sr-only">(done)</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="mt-auto hidden space-y-3 lg:block">
            {toggle}
            <p className="text-muted-foreground flex items-center gap-1 px-2 text-xs">
              <Kbd>←</Kbd>
              <Kbd>→</Kbd>
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              <span className="ml-1">to move between steps</span>
            </p>
          </div>
        </aside>
      )}

      {showAll ? (
        <div className="min-w-0 flex-1 px-4 pt-5 pb-10 sm:px-8 lg:px-16 lg:pt-8">
          <div className="mb-12 flex flex-col items-start gap-3">
            <div className="-ml-2">{toggle}</div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">About</h1>
          </div>
          <div className="grid gap-x-16 gap-y-16 lg:grid-cols-2 lg:gap-y-24">
            {ABOUT_STEPS.map((s, i) => (
              <section
                key={s.id}
                aria-labelledby={`about-${s.id}`}
                className={cn("min-w-0", FULL_WIDTH_SECTIONS.has(s.id) && "lg:col-span-2")}
              >
                <div className="space-y-1">
                  <p className="text-primary font-mono text-base">{String(i + 1).padStart(2, "0")}</p>
                  <h2 id={`about-${s.id}`} className="text-3xl font-semibold tracking-tight">
                    {s.title}
                  </h2>
                </div>
                <StepContent step={s} languages={languages} large />
              </section>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col">
          <section
            aria-live="polite"
            className="flex flex-1 flex-col px-4 pt-5 pb-0 sm:px-8 lg:px-16 lg:pt-8"
          >
            <div>
              <p className="text-muted-foreground text-sm">
                Step {index + 1} of {ABOUT_STEPS.length}
              </p>
              <h2
                key={step.id}
                className="mcv-frame-in mt-2 mb-6 text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                {step.title}
              </h2>
              <StepContent step={step} languages={languages} large />
            </div>
            {/* In the page flow, so it sits bottom-right when there's room and below the text when there isn't. */}
            <span
              aria-hidden
              className="pointer-events-none mt-auto -mr-2 -mb-3 flex self-end overflow-hidden px-2 pt-8 font-mono text-[4.5rem] leading-[1.15] font-semibold tracking-tighter tabular-nums opacity-85 select-none sm:text-[6.5rem] lg:text-[8.5rem]"
            >
              {String(index + 1)
                .padStart(2, "0")
                .split("")
                .map((digit, position) => (
                  // A digit only remounts (and animates) when its own value changes.
                  <StepDigit
                    key={`${position}-${digit}`}
                    digit={digit}
                    direction={direction}
                    padding={position < 2 - String(index + 1).length}
                  />
                ))}
            </span>
          </section>

          <div className="bg-background/90 sticky bottom-0 flex items-center justify-between gap-3 px-4 py-5 backdrop-blur sm:px-8 lg:px-16">
            <Button variant="ghost" className="-ml-4" onClick={() => goTo(index - 1)} disabled={index === 0}>
              <ArrowLeftIcon aria-hidden />
              <span className="sr-only sm:not-sr-only">Previous</span>
            </Button>
            <ol className="flex items-center gap-1.5" aria-label="Progress">
              {ABOUT_STEPS.map((s, i) => (
                <li key={s.id}>
                  <Hint content={`Step ${i + 1}: ${s.title}`}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Step ${i + 1}: ${s.title}`}
                    aria-current={i === index ? "step" : undefined}
                    className="group flex h-6 items-center"
                  >
                    <span
                      className={cn(
                        "block h-1.5 rounded-full transition-all duration-300",
                        i === index
                          ? "bg-primary w-6"
                          : i < index
                            ? "bg-primary/50 w-1.5"
                            : "bg-muted group-hover:bg-muted-foreground/40 w-1.5",
                      )}
                    />
                  </button>
                  </Hint>
                </li>
              ))}
            </ol>
            {next ? (
              <Button onClick={() => goTo(index + 1)}>
                <span className="max-w-72 truncate">
                  Next<span className="hidden sm:inline">: {next.title}</span>
                </span>
                <ArrowRightIcon aria-hidden />
              </Button>
            ) : (
              <Button asChild>
                <Link href="/">
                  Try it now
                  <ArrowRightIcon aria-hidden />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
