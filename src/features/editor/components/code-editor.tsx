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
      "editor.foreground": "#adbac7",
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
} as const satisfies Record<ThemeId, { base: "vs" | "vs-dark"; colors: Record<string, string> }>;

const editorThemeName = (theme: ThemeId) => `mcv-${theme}`;

const defineThemes: BeforeMount = (monaco) => {
  for (const id of THEME_IDS) {
    const { base, colors } = EDITOR_THEMES[id];
    monaco.editor.defineTheme(editorThemeName(id), {
      base,
      inherit: true,
      rules: [],
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
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
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
