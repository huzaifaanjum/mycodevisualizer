import { CREATOR, LIMITS, SITE, type LanguageId } from "@/shared/constants";

export type AboutStepId = "intro" | "why" | "how" | "languages" | "limits" | "privacy" | "creator" | "source";

export interface AboutStep {
  id: AboutStepId;
  title: string;
  /** Plain-English paragraphs. Keep each step short: one idea per step. */
  body: string[];
}

/** One tab on the "Languages" step. Built on the server from the language registry. */
export interface LanguageTab {
  id: LanguageId;
  name: string;
  requirements: string;
  supported: string[];
  notAvailable: string[];
}

export const ABOUT_STEPS: AboutStep[] = [
  {
    id: "intro",
    title: "What is this?",
    body: [
      `${SITE.name} runs your program and lets you replay it one line at a time.`,
      "You see what every line does to your variables, arrays and objects, instead of guessing from the output.",
    ],
  },
  {
    id: "why",
    title: "Why does it exist?",
    body: [
      "It's built for students in their first programming course.",
      "Reading code is one thing. Watching a loop counter tick up, or a recursive call stack grow and shrink, is usually what makes it click.",
    ],
  },
  {
    id: "how",
    title: "How does it work?",
    body: [
      "Your code runs in a fresh sandbox with no internet access, which is deleted as soon as the run ends.",
      "Every line is recorded as it runs: the call stack, each variable, what's in memory, and anything printed or typed in. Your browser then replays that recording with a short note for each step.",
    ],
  },
  {
    id: "limits",
    title: "What are the limits?",
    body: ["The limits keep the service free and fast for everyone. They are plenty for course exercises."],
  },
  {
    id: "languages",
    title: "Which languages can I use?",
    body: ["Pick a language to see what you can run with it. More languages are on the way."],
  },
  {
    id: "privacy",
    title: "Is my code private?",
    body: [
      "Your code isn't saved unless you press Share, and you never need an account.",
      "Raw IP addresses aren't stored either.",
    ],
  },
  {
    id: "source",
    title: "Is it open source?",
    body: [
      `${SITE.name} is free and open source. You're welcome to read the code, report a bug or suggest an idea.`,
    ],
  },
  {
    id: "creator",
    title: "Who made it?",
    body: [...CREATOR.bio],
  },
];

/**
 * Languages we plan to support but that aren't in the language registry yet. They get a
 * "coming soon" tab on the About page. Move one into the registry once it really runs.
 */
export const UPCOMING_LANGUAGES = [{ id: "python", name: "Python" }] as const;
export type UpcomingLanguageId = (typeof UPCOMING_LANGUAGES)[number]["id"];

export type LimitId = "steps" | "time" | "code" | "input";

export const LIMIT_ROWS: { id: LimitId; label: string; value: string }[] = [
  { id: "steps", label: "Steps", value: LIMITS.maxSteps.toLocaleString() },
  { id: "time", label: "Time", value: `${LIMITS.executionTimeoutMs / 1000} seconds` },
  { id: "code", label: "Code size", value: `${LIMITS.maxCodeBytes / 1024} KB` },
  { id: "input", label: "Input size", value: `${LIMITS.maxStdinBytes / 1024} KB` },
];

/** Keeps a step index inside the tour. */
export function clampStep(index: number): number {
  return Math.max(0, Math.min(ABOUT_STEPS.length - 1, index));
}
