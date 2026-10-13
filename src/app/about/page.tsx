import {
  ArrowRightIcon,
  BriefcaseIcon,
  CodeXmlIcon,
  ExternalLinkIcon,
  EyeOffIcon,
  FileTextIcon,
  FootprintsIcon,
  GlobeIcon,
  type LucideIcon,
  LockIcon,
  MemoryStickIcon,
  MessageSquareTextIcon,
  NetworkIcon,
  PlayIcon,
  ServerIcon,
  Share2Icon,
  ShieldCheckIcon,
  SparklesIcon,
  WorkflowIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/common/back-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { exampleService } from "@/server/services/example.service";
import { CREATOR, LIMITS, SITE } from "@/shared/constants";

export const metadata: Metadata = {
  title: "About",
  description: `How ${SITE.name} runs your Java code step by step, what it shows you, and who built it.`,
};

/** Example counts can change when examples are curated in MongoDB; match the examples page. */
export const revalidate = 300;

type CreatorLinkKind = (typeof CREATOR.links)[number]["kind"];

const LINK_ICONS: Record<CreatorLinkKind, LucideIcon> = {
  portfolio: GlobeIcon,
  github: CodeXmlIcon,
  linkedin: BriefcaseIcon,
  resume: FileTextIcon,
};

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ServerIcon,
    title: "Isolated sandbox",
    body: "Your code runs in a fresh sandbox with no internet access, deleted as soon as the run ends.",
  },
  {
    icon: CodeXmlIcon,
    title: "Compile with debug info",
    body: "Java compiles your program so a debugger can follow every line and variable.",
  },
  {
    icon: FootprintsIcon,
    title: "Record every step",
    body: "At each line we capture the call stack, variables, arrays, objects, input read and output printed.",
  },
  {
    icon: PlayIcon,
    title: "Replay in your browser",
    body: "Step forward and back through the recording, with a plain-English note for each step.",
  },
];

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: MemoryStickIcon,
    title: "Memory view",
    body: "Stack frames and heap objects side by side, with arrows showing which variable points where.",
  },
  {
    icon: NetworkIcon,
    title: "Call tree",
    body: "Every method call in order, so recursion and nested calls are easy to follow.",
  },
  {
    icon: WorkflowIcon,
    title: "Flow view",
    body: "See which lines ran, how often, and which branches were taken with your input.",
  },
  {
    icon: MessageSquareTextIcon,
    title: "Step notes",
    body: "Each step explains what just happened in plain English, written for beginners.",
  },
  {
    icon: PlayIcon,
    title: "Playback controls",
    body: "Play, pause, scrub and change speed, or step with the keyboard.",
  },
  {
    icon: Share2Icon,
    title: "Shareable links",
    body: "Send a program to a classmate or instructor and they see the same run.",
  },
];

const JAVA_CONCEPTS = [
  "Variables",
  "Conditions",
  "Loops",
  "Arrays",
  "Methods",
  "Recursion",
  "Scanner input",
  "Your own classes",
  "ArrayList",
  "HashMap",
  "HashSet",
  "TreeMap",
  "Stacks & queues",
];

/** Mirrors the rules in languages/java/unsupported.ts, in student-friendly words. */
const SANDBOX_EXCLUSIONS = [
  "Threads",
  "Network access",
  "Reading or writing files",
  "Starting other programs",
  "Reflection",
];

const PREVIEW_CODE = [
  "static int factorial(int n) {",
  "    if (n <= 1) return 1;",
  "    return n * factorial(n - 1);",
  "}",
];

const PREVIEW_FRAMES = [
  { name: "factorial", vars: "n = 1", current: true },
  { name: "factorial", vars: "n = 2", current: false },
  { name: "factorial", vars: "n = 3", current: false },
  { name: "main", vars: "args", current: false },
];

/** A static, decorative miniature of the visualizer for the hero. */
function VisualizerPreview() {
  return (
    <figure
      aria-label="Preview: the visualizer paused inside a recursive factorial call"
      className="bg-card shadow-primary/10 hidden overflow-hidden rounded-xl border shadow-2xl xl:block"
    >
      <div className="flex items-center gap-1.5 border-b px-3 py-2">
        <span aria-hidden className="bg-muted-foreground/30 size-2.5 rounded-full" />
        <span aria-hidden className="bg-muted-foreground/30 size-2.5 rounded-full" />
        <span aria-hidden className="bg-muted-foreground/30 size-2.5 rounded-full" />
        <span className="text-muted-foreground ml-2 font-mono text-[11px]">Main.java</span>
      </div>
      <pre className="border-b py-2 font-mono text-xs leading-6">
        {PREVIEW_CODE.map((line, i) => (
          <div
            key={line}
            className={
              i === 1
                ? "border-primary bg-primary/10 text-foreground border-l-2"
                : "text-muted-foreground border-l-2 border-transparent"
            }
          >
            <span className="text-muted-foreground/50 inline-block w-8 pr-3 text-right select-none">
              {i + 4}
            </span>
            {line}
          </div>
        ))}
      </pre>
      <div className="space-y-1.5 p-3">
        <p className="text-muted-foreground mb-2 font-mono text-[10px] tracking-widest uppercase">
          Call stack
        </p>
        {PREVIEW_FRAMES.map((f, i) => (
          <div
            key={i}
            className={
              f.current
                ? "border-primary/60 bg-primary/5 flex items-center justify-between rounded-md border px-2.5 py-1.5 font-mono text-xs"
                : "text-muted-foreground flex items-center justify-between rounded-md border px-2.5 py-1.5 font-mono text-xs"
            }
          >
            <span className={f.current ? "text-foreground" : undefined}>{f.name}()</span>
            <span className={f.current ? "text-changed" : undefined}>{f.vars}</span>
          </div>
        ))}
      </div>
      <figcaption className="bg-background/60 text-muted-foreground flex items-center gap-2 border-t px-3 py-2 text-xs">
        <span className="bg-primary/15 text-primary rounded px-1.5 py-0.5 font-mono text-[10px]">
          Step 9 / 19
        </span>
        n is 1, so this call returns 1 and the stack starts to unwind.
      </figcaption>
    </figure>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 max-w-2xl space-y-2">
      <p className="text-primary font-mono text-xs font-medium tracking-widest uppercase">{eyebrow}</p>
      <h2 id={id} className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
      {children && <p className="text-muted-foreground text-base">{children}</p>}
    </div>
  );
}

function ExternalLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

export default async function AboutPage() {
  const examples = await exampleService.list();
  const topicCount = new Set(examples.map((e) => e.topic)).size;
  const stats = [
    { value: examples.length.toString(), label: "ready-made examples" },
    { value: topicCount.toString(), label: "Coding 101 topics" },
    { value: LIMITS.maxSteps.toLocaleString(), label: "steps per run" },
    { value: "$0", label: "free, no sign-up needed" },
  ];

  return (
    <article className="text-foreground/90 w-full text-sm leading-relaxed">
      {/* Hero */}
      <header className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="from-primary/10 via-primary/5 pointer-events-none absolute inset-0 bg-linear-to-b to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] mask-[radial-gradient(ellipse_at_top,black,transparent_70%)] bg-size-[32px_32px] opacity-40"
        />
        <div className="relative px-4 pt-6 pb-14 sm:px-8 lg:px-12 lg:pb-20">
          <BackButton />
          <div className="mt-8 grid items-center gap-12 xl:grid-cols-[minmax(0,1fr)_440px]">
            <div>
              <div className="max-w-3xl space-y-6">
                <Badge variant="outline" className="bg-background/60 gap-1.5 px-2.5 py-1 backdrop-blur">
                  <SparklesIcon aria-hidden className="text-primary size-3.5" />
                  Free · Open source · Built for Coding 101
                </Badge>
                <h1 className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl">
                  See what your code is <span className="text-primary">really</span> doing.
                </h1>
                <p className="text-muted-foreground max-w-2xl text-base sm:text-lg">
                  {SITE.name} runs your Java program, records every line it executes, and lets you replay it
                  one step at a time, so you can watch variables change, methods call each other and objects
                  appear in memory.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link href="/">
                      Start visualizing
                      <ArrowRightIcon aria-hidden />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="bg-background/60">
                    <Link href="/examples">Browse examples</Link>
                  </Button>
                </div>
              </div>

              <dl className="bg-border mt-12 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-4">
                {stats.map((s) => (
                  <div key={s.label} className="bg-card/80 px-5 py-4 backdrop-blur">
                    <dt className="text-muted-foreground text-xs">{s.label}</dt>
                    <dd className="text-foreground mt-1 font-mono text-2xl font-semibold">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <VisualizerPreview />
          </div>
        </div>
      </header>

      <div className="space-y-20 px-4 py-16 sm:px-8 lg:px-12">
        {/* How it works */}
        <section aria-labelledby="how-it-works">
          <SectionHeading
            id="how-it-works"
            eyebrow="How it works"
            title="From your code to a step-by-step replay"
          >
            Four stages, usually finished in a few seconds.
          </SectionHeading>
          <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="bg-card relative rounded-xl border p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                    <step.icon aria-hidden className="size-5" />
                  </span>
                  <span aria-hidden className="text-muted-foreground/30 font-mono text-3xl font-semibold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="text-foreground mb-1.5 font-semibold">{step.title}</h3>
                <p className="text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section aria-labelledby="features">
          <SectionHeading id="features" eyebrow="What you'll see" title="Every view a beginner needs">
            Switch between views at any step. They all stay in sync with the line that just ran.
          </SectionHeading>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="group bg-card hover:border-primary/50 flex gap-4 rounded-xl border p-6 transition-colors"
              >
                <span className="bg-background text-primary group-hover:bg-primary group-hover:text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-lg border transition-colors">
                  <f.icon aria-hidden className="size-5" />
                </span>
                <div>
                  <h3 className="text-foreground mb-1 font-semibold">{f.title}</h3>
                  <p className="text-muted-foreground">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Java support + limits */}
        <section aria-labelledby="java-support">
          <SectionHeading
            id="java-support"
            eyebrow="Language support"
            title="Java today, more languages coming"
          >
            Write a single file with a main method. Everything a first programming course covers is supported.
          </SectionHeading>
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="bg-card rounded-xl border p-6 lg:col-span-3">
              <h3 className="text-foreground mb-4 font-semibold">Supported concepts</h3>
              <ul className="flex flex-wrap gap-2">
                {JAVA_CONCEPTS.map((c) => (
                  <li
                    key={c}
                    className="bg-background text-foreground rounded-md border px-2.5 py-1 font-mono text-xs"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <h3 className="text-foreground mt-6 mb-3 font-semibold">Not available in the sandbox</h3>
              <ul className="flex flex-wrap gap-2">
                {SANDBOX_EXCLUSIONS.map((c) => (
                  <li
                    key={c}
                    className="text-muted-foreground rounded-md border border-dashed px-2.5 py-1 font-mono text-xs"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-3">
                If your code uses one of these, you get a clear message instead of a confusing failure.
              </p>
            </div>
            <div className="bg-card rounded-xl border p-6 lg:col-span-2">
              <h3 className="text-foreground mb-4 font-semibold">Limits per run</h3>
              <dl className="divide-y">
                {[
                  ["Steps", LIMITS.maxSteps.toLocaleString()],
                  ["Time", `${LIMITS.executionTimeoutMs / 1000} seconds`],
                  ["Code size", `${LIMITS.maxCodeBytes / 1024} KB`],
                  ["Input size", `${LIMITS.maxStdinBytes / 1024} KB`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-2.5">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-foreground font-mono font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section aria-labelledby="privacy">
          <SectionHeading id="privacy" eyebrow="Privacy & safety" title="Your code stays yours" />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: ShieldCheckIcon,
                title: "Sandboxed",
                body: "Every run gets its own throwaway sandbox with no network access.",
              },
              {
                icon: EyeOffIcon,
                title: "Not stored",
                body: "Code you visualize is not saved unless you choose to share it.",
              },
              {
                icon: LockIcon,
                title: "Minimal data",
                body: "No raw IP addresses are kept, and accounts are entirely optional.",
              },
            ].map((p) => (
              <div key={p.title} className="bg-card flex gap-3 rounded-xl border p-5">
                <p.icon aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
                <div>
                  <h3 className="text-foreground font-semibold">{p.title}</h3>
                  <p className="text-muted-foreground">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-4">
            Read the full{" "}
            <Link className="text-primary font-medium underline-offset-4 hover:underline" href="/privacy">
              privacy notes
            </Link>
            .
          </p>
        </section>

        {/* Creator */}
        <section aria-labelledby="creator">
          <SectionHeading id="creator" eyebrow="The creator" title="Who built this" />
          <div className="bg-card grid gap-8 rounded-2xl border p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-2xl space-y-3">
              <div>
                <p className="text-foreground text-xl font-semibold">{CREATOR.name}</p>
                <p className="text-primary font-medium">{CREATOR.role}</p>
              </div>
              <p className="text-muted-foreground text-base">{CREATOR.bio}</p>
            </div>
            <ul className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:grid lg:w-72 lg:grid-cols-2">
              {CREATOR.links.map((l) => {
                const Icon = LINK_ICONS[l.kind];
                return (
                  <li key={l.kind}>
                    <Button variant="outline" asChild className="w-full justify-start">
                      <ExternalLink href={l.href}>
                        <Icon aria-hidden className="text-primary" />
                        {l.label}
                        <ExternalLinkIcon aria-hidden className="text-muted-foreground ml-auto size-3.5" />
                      </ExternalLink>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Closing CTA */}
        <section
          aria-labelledby="get-started"
          className="bg-primary/5 relative overflow-hidden rounded-2xl border px-6 py-12 text-center sm:px-12"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--primary)_0%,transparent_65%)] opacity-10"
          />
          <div className="relative mx-auto max-w-xl space-y-4">
            <h2
              id="get-started"
              className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              Ready to watch your code run?
            </h2>
            <p className="text-muted-foreground text-base">
              Paste a program or pick an example. No account, no install.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/">
                  Open the visualizer
                  <ArrowRightIcon aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-background/60">
                <ExternalLink href={SITE.repository}>
                  <CodeXmlIcon aria-hidden />
                  View source on GitHub
                </ExternalLink>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
