"use client";

import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import type { Diagnostic } from "@/shared/trace";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/features/theme";
import { THEME_IDS, type ThemeId } from "@/shared/constants";

type MonacoEditor = Parameters<OnMount>[0];
type Monaco = Parameters<OnMount>[1];

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  readOnly: boolean;
  currentLine?: number;
  previousLine?: number;
  breakpoints: ReadonlySet<number>;
  onToggleBreakpoint: (line: number) => void;
  diagnostics?: Diagnostic[];
  /** Changing this number scrolls the editor to `revealLine`. */
  revealRequest?: { line: number; nonce: number };
  /** Font size in pixels; the code zoom controls change it. */
  fontSize?: number;
}

/** Monaco themes mirroring the app themes in globals.css. */
const EDITOR_THEMES = {
  black: {
    base: "vs-dark",
    colors: {
      "editor.foreground": "#fafafa",
      "editor.background": "#000000",
      "editorGutter.background": "#000000",
      "editor.lineHighlightBackground": "#0b0b0b",
      "editorLineNumber.foreground": "#4b4b4b",
      "editorLineNumber.activeForeground": "#d4d4d4",
      "editorWidget.background": "#0a0a0a",
      "editorIndentGuide.background1": "#161616",
      "scrollbarSlider.background": "#ffffff14",
    },
  },
  dim: {
    base: "vs-dark",
    colors: {
      "editor.background": "#22272e",
      "editor.foreground": "#eceff1",
      "editorGutter.background": "#22272e",
      "editor.lineHighlightBackground": "#2a3038",
      "editorLineNumber.foreground": "#636e7b",
      "editorLineNumber.activeForeground": "#cdd3da",
      "editorWidget.background": "#2d333b",
      "editorIndentGuide.background1": "#373e47",
      "scrollbarSlider.background": "#ffffff1a",
    },
  },
  light: {
    base: "vs",
    colors: {
      "editor.foreground": "#18181b",
      "editor.background": "#fafafa",
      "editorGutter.background": "#fafafa",
      "editor.lineHighlightBackground": "#f0f0f2",
      "editorLineNumber.foreground": "#a1a1aa",
      "editorLineNumber.activeForeground": "#3f3f46",
      "editorWidget.background": "#ffffff",
      "editorIndentGuide.background1": "#e4e4e7",
      "scrollbarSlider.background": "#0000001a",
    },
  },
  sepia: {
    base: "vs",
    colors: {
      "editor.background": "#f4ecd8",
      "editor.foreground": "#34281b",
      "editorGutter.background": "#f4ecd8",
      "editor.lineHighlightBackground": "#ebe1c8",
      "editorLineNumber.foreground": "#a8977a",
      "editorLineNumber.activeForeground": "#433422",
      "editorWidget.background": "#fbf6ea",
      "editorIndentGuide.background1": "#ddd0b3",
      "scrollbarSlider.background": "#0000001a",
    },
  },
  midnight: {
    base: "vs-dark",
    colors: {
      "editor.background": "#0b1020",
      "editor.foreground": "#dbe3f0",
      "editorGutter.background": "#0b1020",
      "editor.lineHighlightBackground": "#121a2e",
      "editorLineNumber.foreground": "#4a5672",
      "editorLineNumber.activeForeground": "#dbe3f0",
      "editorWidget.background": "#131b30",
      "editorIndentGuide.background1": "#1e2943",
      "scrollbarSlider.background": "#ffffff1a",
    },
  },
  mocha: {
    base: "vs-dark",
    colors: {
      "editor.background": "#1e1915",
      "editor.foreground": "#e8dccb",
      "editorGutter.background": "#1e1915",
      "editor.lineHighlightBackground": "#28211b",
      "editorLineNumber.foreground": "#6b5d4e",
      "editorLineNumber.activeForeground": "#e8dccb",
      "editorWidget.background": "#2a231d",
      "editorIndentGuide.background1": "#3a3028",
      "scrollbarSlider.background": "#ffffff1a",
    },
  },
  white: {
    base: "vs",
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#0a0a0a",
      "editorGutter.background": "#ffffff",
      "editor.lineHighlightBackground": "#f4f4f5",
      "editorLineNumber.foreground": "#a1a1aa",
      "editorLineNumber.activeForeground": "#27272a",
      "editorWidget.background": "#ffffff",
      "editorIndentGuide.background1": "#e4e4e7",
      "scrollbarSlider.background": "#0000001a",
    },
  },
  "solarized-light": {
    base: "vs",
    colors: {
      "editor.background": "#fdf6e3",
      "editor.foreground": "#07333f",
      "editorGutter.background": "#fdf6e3",
      "editor.lineHighlightBackground": "#eee8d5",
      "editorLineNumber.foreground": "#7f8f8f",
      "editorLineNumber.activeForeground": "#073642",
      "editorWidget.background": "#fffbef",
      "editorIndentGuide.background1": "#e4ddc8",
      "scrollbarSlider.background": "#0000001a",
    },
  },
  nord: {
    base: "vs-dark",
    colors: {
      "editor.background": "#2e3440",
      "editor.foreground": "#ffffff",
      "editorGutter.background": "#2e3440",
      "editor.lineHighlightBackground": "#3b4252",
      "editorLineNumber.foreground": "#6c7891",
      "editorLineNumber.activeForeground": "#e5e9f0",
      "editorWidget.background": "#3b4252",
      "editorIndentGuide.background1": "#434c5e",
      "scrollbarSlider.background": "#ffffff1a",
    },
  },
  dracula: {
    base: "vs-dark",
    colors: {
      "editor.background": "#282a36",
      "editor.foreground": "#f8f8f2",
      "editorGutter.background": "#282a36",
      "editor.lineHighlightBackground": "#2f3241",
      "editorLineNumber.foreground": "#7d89b8",
      "editorLineNumber.activeForeground": "#f8f8f2",
      "editorWidget.background": "#343746",
      "editorIndentGuide.background1": "#3a3d4f",
      "scrollbarSlider.background": "#ffffff1a",
    },
  },
  "one-dark": {
    base: "vs-dark",
    colors: {
      "editor.background": "#282c34",
      "editor.foreground": "#eaecef",
      "editorGutter.background": "#282c34",
      "editor.lineHighlightBackground": "#2c313a",
      "editorLineNumber.foreground": "#6b7385",
      "editorLineNumber.activeForeground": "#abb2bf",
      "editorWidget.background": "#21252b",
      "editorIndentGuide.background1": "#3b4048",
      "scrollbarSlider.background": "#ffffff1a",
    },
  },
  gruvbox: {
    base: "vs-dark",
    colors: {
      "editor.background": "#282828",
      "editor.foreground": "#fbf9f1",
      "editorGutter.background": "#282828",
      "editor.lineHighlightBackground": "#32302f",
      "editorLineNumber.foreground": "#928374",
      "editorLineNumber.activeForeground": "#ebdbb2",
      "editorWidget.background": "#3c3836",
      "editorIndentGuide.background1": "#3c3836",
      "scrollbarSlider.background": "#ffffff1a",
    },
  },
  "solarized-dark": {
    base: "vs-dark",
    colors: {
      "editor.background": "#002b36",
      "editor.foreground": "#eaeded",
      "editorGutter.background": "#002b36",
      "editor.lineHighlightBackground": "#073642",
      "editorLineNumber.foreground": "#6c8a91",
      "editorLineNumber.activeForeground": "#eee8d5",
      "editorWidget.background": "#073642",
      "editorIndentGuide.background1": "#0e4351",
      "scrollbarSlider.background": "#ffffff1a",
    },
  },
} as const satisfies Record<ThemeId, { base: "vs" | "vs-dark"; colors: Record<string, string> }>;

/** Syntax colors per theme: every token is at least 7:1 against the editor background (comments 5.5:1). */
const EDITOR_SYNTAX = {
  black: {
    text: "#fafafa",
    keyword: "#5da0d8",
    type: "#4ec9b0",
    string: "#ce9178",
    number: "#b5cea8",
    comment: "#6a9955",
    annotation: "#dcdcaa",
  },
  dim: {
    text: "#eceff1",
    keyword: "#f8a8a2",
    type: "#f7ac6a",
    string: "#96d0ff",
    number: "#84c2ff",
    comment: "#9fa8b1",
    annotation: "#dcbdfb",
  },
  midnight: {
    text: "#dbe3f0",
    keyword: "#bb9af7",
    type: "#2ac3de",
    string: "#9ece6a",
    number: "#ff9e64",
    comment: "#8a91ae",
    annotation: "#7da4f7",
  },
  mocha: {
    text: "#e8dccb",
    keyword: "#ea9a67",
    type: "#d8a657",
    string: "#a9b665",
    number: "#da9bac",
    comment: "#a3978a",
    annotation: "#8ab6ac",
  },
  // Nord's surfaces are light for a dark theme; 5.5:1 keeps its hues instead of washing them to white.
  nord: {
    text: "#ffffff",
    keyword: "#aec3d7",
    type: "#a1c7c6",
    string: "#b0c79c",
    number: "#d0b9cc",
    comment: "#a7aebc",
    annotation: "#e2b6a8",
  },
  dracula: {
    text: "#f8f8f2",
    keyword: "#ffa5d9",
    type: "#8be9fd",
    string: "#f1fa8c",
    number: "#d1b4fb",
    comment: "#a1aac8",
    annotation: "#50fa7b",
  },
  "one-dark": {
    text: "#eaecef",
    keyword: "#ddaeeb",
    type: "#e5c07b",
    string: "#a3ca88",
    number: "#deb792",
    comment: "#a5a9b0",
    annotation: "#8ac4f3",
  },
  gruvbox: {
    text: "#fbf9f1",
    keyword: "#fda89e",
    type: "#fabd2f",
    string: "#c1c442",
    number: "#e3b2bf",
    comment: "#b1a69b",
    annotation: "#9ec98e",
  },
  "solarized-dark": {
    text: "#eaeded",
    keyword: "#bbc670",
    type: "#d6bd70",
    string: "#8acbc6",
    number: "#edadcc",
    comment: "#9eacad",
    annotation: "#92c5e8",
  },
  light: {
    text: "#18181b",
    keyword: "#9d1a23",
    type: "#8c3500",
    string: "#0a3069",
    number: "#054da7",
    comment: "#596068",
    annotation: "#5f3aa3",
  },
  white: {
    text: "#0a0a0a",
    keyword: "#a11b24",
    type: "#8f3600",
    string: "#0a3069",
    number: "#054fac",
    comment: "#5b636b",
    annotation: "#623ca7",
  },
  sepia: {
    text: "#34281b",
    keyword: "#7a3122",
    type: "#634100",
    string: "#2f5019",
    number: "#63327f",
    comment: "#615545",
    annotation: "#254a6c",
  },
  "solarized-light": {
    text: "#07333f",
    keyword: "#465100",
    type: "#5e4700",
    string: "#16544f",
    number: "#892354",
    comment: "#555d5d",
    annotation: "#164f78",
  },
} as const satisfies Record<
  ThemeId,
  Record<"text" | "keyword" | "type" | "string" | "number" | "comment" | "annotation", string>
>;

const editorThemeName = (theme: ThemeId) => `mcv-${theme}`;

const defineThemes: BeforeMount = (monaco) => {
  for (const id of THEME_IDS) {
    const { base, colors } = EDITOR_THEMES[id];
    const syntax = EDITOR_SYNTAX[id];
    const fg = (hex: string) => hex.slice(1);
    monaco.editor.defineTheme(editorThemeName(id), {
      base,
      inherit: true,
      rules: [
        { token: "", foreground: fg(syntax.text) },
        { token: "identifier", foreground: fg(syntax.text) },
        { token: "delimiter", foreground: fg(syntax.text) },
        { token: "operator", foreground: fg(syntax.text) },
        { token: "keyword", foreground: fg(syntax.keyword) },
        { token: "type", foreground: fg(syntax.type) },
        { token: "type.identifier", foreground: fg(syntax.type) },
        { token: "string", foreground: fg(syntax.string) },
        { token: "number", foreground: fg(syntax.number) },
        { token: "comment", foreground: fg(syntax.comment) },
        { token: "annotation", foreground: fg(syntax.annotation) },
      ],
      colors: { ...colors, "editor.lineHighlightBorder": "#00000000" },
    });
  }
};

/** Monaco wrapper: current-line highlight, clickable breakpoint gutter and compile-error markers. */
export function CodeEditor({
  value,
  onChange,
  language,
  readOnly,
  currentLine,
  previousLine,
  breakpoints,
  onToggleBreakpoint,
  diagnostics,
  revealRequest,
  fontSize = 14,
}: CodeEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<ReturnType<MonacoEditor["createDecorationsCollection"]> | null>(null);
  const toggleRef = useRef(onToggleBreakpoint);
  useEffect(() => {
    toggleRef.current = onToggleBreakpoint;
  }, [onToggleBreakpoint]);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    decorationsRef.current = editor.createDecorationsCollection();
    // Monaco measures glyphs on mount; re-measure once the web code font has loaded.
    void document.fonts.ready.then(() => monaco.editor.remeasureFonts());
    editor.onMouseDown((e) => {
      const t = e.target.type;
      const line = e.target.position?.lineNumber;
      if (
        line &&
        (t === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
          t === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS)
      ) {
        toggleRef.current(line);
      }
    });
  };

  // Execution highlights and breakpoints.
  useEffect(() => {
    const monaco = monacoRef.current;
    const collection = decorationsRef.current;
    if (!monaco || !collection) return;
    const decorations: Parameters<typeof collection.set>[0][number][] = [];
    if (previousLine && previousLine !== currentLine) {
      decorations.push({
        range: new monaco.Range(previousLine, 1, previousLine, 1),
        options: { isWholeLine: true, className: "mcv-previous-line" },
      });
    }
    if (currentLine) {
      decorations.push({
        range: new monaco.Range(currentLine, 1, currentLine, 1),
        options: { isWholeLine: true, className: "mcv-current-line" },
      });
      editorRef.current?.revealLineInCenterIfOutsideViewport(currentLine);
    }
    for (const line of breakpoints) {
      decorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          glyphMarginClassName: "mcv-breakpoint",
          glyphMarginHoverMessage: { value: "Breakpoint: autoplay pauses here" },
        },
      });
    }
    collection.set(decorations);
  }, [currentLine, previousLine, breakpoints]);

  // Compile-error markers.
  useEffect(() => {
    const monaco = monacoRef.current;
    const model = editorRef.current?.getModel();
    if (!monaco || !model) return;
    monaco.editor.setModelMarkers(
      model,
      "mcv",
      (diagnostics ?? []).map((d) => ({
        startLineNumber: d.line,
        startColumn: d.column,
        endLineNumber: d.line,
        endColumn: d.column + 1,
        message: d.message,
        severity: monaco.MarkerSeverity.Error,
      })),
    );
  }, [diagnostics]);

  useEffect(() => {
    if (!revealRequest) return;
    editorRef.current?.revealLineInCenter(revealRequest.line);
    editorRef.current?.setPosition({ lineNumber: revealRequest.line, column: 1 });
    editorRef.current?.focus();
  }, [revealRequest]);

  return (
    <div className="h-full min-h-0" data-testid="code-editor">
      <Editor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        language={language}
        theme={editorThemeName(theme)}
        beforeMount={defineThemes}
        onMount={onMount}
        loading={<Skeleton className="m-3 h-[calc(100%-1.5rem)]" />}
        options={{
          readOnly,
          fontSize,
          fontFamily: "var(--font-code), ui-monospace, monospace",
          fontLigatures: false,
          // A touch heavier than regular so code stays crisp on every background.
          fontWeight: "500",
          minimap: { enabled: false },
          glyphMargin: true,
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          renderLineHighlight: readOnly ? "none" : "line",
          tabSize: 4,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          smoothScrolling: true,
          ariaLabel: "Java code editor",
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        }}
      />
    </div>
  );
}
