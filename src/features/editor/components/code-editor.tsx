"use client";

import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import type { Diagnostic } from "@/shared/trace";
import { Skeleton } from "@/components/ui/skeleton";

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
}

const THEME = "mcv-black";

const defineTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#000000",
      "editorGutter.background": "#000000",
      "editor.lineHighlightBackground": "#0b0b0b",
      "editor.lineHighlightBorder": "#00000000",
      "editorLineNumber.foreground": "#4b4b4b",
      "editorLineNumber.activeForeground": "#d4d4d4",
      "editorWidget.background": "#0a0a0a",
      "editorIndentGuide.background1": "#161616",
      "scrollbarSlider.background": "#ffffff14",
    },
  });
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
}: CodeEditorProps) {
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<ReturnType<MonacoEditor["createDecorationsCollection"]> | null>(null);
  const toggleRef = useRef(onToggleBreakpoint);
  toggleRef.current = onToggleBreakpoint;

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    decorationsRef.current = editor.createDecorationsCollection();
    editor.onMouseDown((e) => {
      const t = e.target.type;
      const line = e.target.position?.lineNumber;
      if (line && (t === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN || t === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS)) {
        toggleRef.current(line);
      }
    });
  };

  // Execution highlights and breakpoints.
  useEffect(() => {
    const monaco = monacoRef.current;
    const collection = decorationsRef.current;
    if (!monaco || !collection) return;
    const decorations: Parameters<typeof collection.set>[0] = [];
    if (previousLine && previousLine !== currentLine) {
      decorations.push({ range: new monaco.Range(previousLine, 1, previousLine, 1), options: { isWholeLine: true, className: "mcv-previous-line" } });
    }
    if (currentLine) {
      decorations.push({ range: new monaco.Range(currentLine, 1, currentLine, 1), options: { isWholeLine: true, className: "mcv-current-line" } });
      editorRef.current?.revealLineInCenterIfOutsideViewport(currentLine);
    }
    for (const line of breakpoints) {
      decorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: { glyphMarginClassName: "mcv-breakpoint", glyphMarginHoverMessage: { value: "Breakpoint: autoplay pauses here" } },
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
        theme={THEME}
        beforeMount={defineTheme}
        onMount={onMount}
        loading={<Skeleton className="m-3 h-[calc(100%-1.5rem)]" />}
        options={{
          readOnly,
          fontSize: 14,
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
