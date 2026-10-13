/**
 * Single source of truth for limits and options shared by UI, API validation and the tracer.
 * Changing a limit here changes it everywhere.
 */
export const LIMITS = {
  maxCodeBytes: 64 * 1024,
  maxStdinBytes: 16 * 1024,
  maxSteps: 1000,
  /** Wall-clock budget for compiling and tracing (debugging adds overhead on top of the program itself). */
  executionTimeoutMs: 8000,
  /** Overall wall time for a run request, including sandbox start-up. */
  requestTimeoutMs: 30_000,
  maxTraceBytes: 6 * 1024 * 1024,
  maxSnippetTitleLength: 80,
} as const;

export const RATE_LIMITS = {
  runsPerMinuteAnonymous: 10,
  runsPerMinuteSignedIn: 30,
  snippetsPerHour: 10,
} as const;

export const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];
/** Milliseconds between autoplay steps at 1x speed. */
export const BASE_STEP_INTERVAL_MS = 800;

export const ACCENTS = [
  { id: "green", label: "Electric green", hex: "#22C55E" },
  { id: "cyan", label: "Cyan", hex: "#22D3EE" },
  { id: "violet", label: "Violet", hex: "#A78BFA" },
  { id: "amber", label: "Amber", hex: "#F59E0B" },
  { id: "pink", label: "Pink", hex: "#F472B6" },
  { id: "mono", label: "Monochrome", hex: "#FAFAFA" },
] as const;
export type AccentId = (typeof ACCENTS)[number]["id"];
export const DEFAULT_ACCENT: AccentId = "green";
export const ACCENT_IDS = ACCENTS.map((a) => a.id) as [AccentId, ...AccentId[]];
export const ACCENT_STORAGE_KEY = "mcv-accent";

/** Black is pure #000 (OLED); dim is a soft dark gray for large or bright screens; light is light. */
export const THEMES = [
  { id: "light", label: "Light", dark: false },
  { id: "dim", label: "Dim", dark: true },
  { id: "black", label: "Black", dark: true },
] as const;
export type ThemeId = (typeof THEMES)[number]["id"];
export const DEFAULT_THEME: ThemeId = "black";
export const THEME_IDS = THEMES.map((t) => t.id) as [ThemeId, ...ThemeId[]];
export const THEME_STORAGE_KEY = "mcv-theme";

export const SUPPORTED_LANGUAGES = ["java"] as const;
export type LanguageId = (typeof SUPPORTED_LANGUAGES)[number];

export const EXAMPLE_TOPICS = [
  "Variables",
  "Conditions",
  "Loops",
  "Arrays",
  "Methods",
  "Recursion",
  "Input",
  "Collections",
] as const;
export type ExampleTopic = (typeof EXAMPLE_TOPICS)[number];

export const DIFFICULTIES = ["Beginner", "Easy", "Medium"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const SITE = {
  name: "mycodevisualizer",
  description: "See your Java code run, one line at a time. A free visualizer for Coding 101.",
} as const;
