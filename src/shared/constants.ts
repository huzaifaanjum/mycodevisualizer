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
  { id: "lime", label: "Lime", hex: "#A3E635" },
  { id: "teal", label: "Teal", hex: "#2DD4BF" },
  { id: "cyan", label: "Cyan", hex: "#22D3EE" },
  { id: "blue", label: "Blue", hex: "#3B82F6" },
  { id: "indigo", label: "Indigo", hex: "#818CF8" },
  { id: "violet", label: "Violet", hex: "#A78BFA" },
  { id: "pink", label: "Pink", hex: "#F472B6" },
  { id: "rose", label: "Rose", hex: "#FB7185" },
  { id: "orange", label: "Orange", hex: "#FB923C" },
  { id: "amber", label: "Amber", hex: "#F59E0B" },
  { id: "mono", label: "Monochrome", hex: "#FAFAFA" },
] as const;
export type AccentId = (typeof ACCENTS)[number]["id"];
export const DEFAULT_ACCENT: AccentId = "green";
export const ACCENT_IDS = ACCENTS.map((a) => a.id) as [AccentId, ...AccentId[]];
export const ACCENT_STORAGE_KEY = "mcv-accent";

/**
 * Black is pure #000 (OLED); dim is a soft dark gray for large or bright screens; light is light.
 * Sepia is a warm paper tone, midnight a deep navy and mocha a warm dark brown.
 */
export const THEMES = [
  { id: "light", label: "Light", dark: false },
  { id: "sepia", label: "Sepia", dark: false },
  { id: "dim", label: "Dim", dark: true },
  { id: "midnight", label: "Midnight", dark: true },
  { id: "mocha", label: "Mocha", dark: true },
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
  "Classes",
  "Input",
  "Collections",
  "Data Structures",
  "Sorting",
] as const;
export type ExampleTopic = (typeof EXAMPLE_TOPICS)[number];

export const DIFFICULTIES = ["Beginner", "Easy", "Medium"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const SITE = {
  name: "mycodevisualizer",
  description: "See your Java code run, one line at a time. A free visualizer for Coding 101.",
  repository: "https://github.com/huzaifaanjum/mycodevisualizer",
} as const;

export const CREATOR = {
  name: "Mohammed Huzaifa",
  role: "Full Stack AI Developer at Air Canada",
  /** First-person paragraphs for the About page. */
  bio: [
    "I build web apps and AI tools for a living, and I care a lot about making hard ideas feel simple.",
    "I made mycodevisualizer because code usually clicks the moment you can see it run. I wanted every student in a first programming course to have that moment, for free.",
    "If it helped you, or something looks wrong, I'd love to hear about it.",
  ],
  links: [
    { kind: "portfolio", label: "Portfolio", href: "https://mohammedhuzaifa.vercel.app/" },
    { kind: "github", label: "GitHub", href: "https://github.com/huzaifaanjum" },
    { kind: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/huzaifa-anjum/" },
    {
      kind: "resume",
      label: "Resume",
      href: "https://mohammedhuzaifa.vercel.app/mohammed_huzaifa_resume.pdf",
    },
  ],
} as const;
