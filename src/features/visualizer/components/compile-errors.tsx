import { CircleXIcon } from "lucide-react";
import type { Diagnostic } from "@/shared/trace";

/** Compiler errors, each mapped to its line with a beginner-friendly explanation. */
export function CompileErrors({
  diagnostics,
  explain,
  onSelectLine,
}: {
  diagnostics: Diagnostic[];
  explain: (message: string) => string;
  onSelectLine?: (line: number) => void;
}) {
  return (
    <div role="alert" className="h-full overflow-auto p-4">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-danger">
        <CircleXIcon className="size-5" aria-hidden />
        The code didn&apos;t compile
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Java checks the whole program before running it. Fix {diagnostics.length === 1 ? "this problem" : "these problems"} and press
        Visualize again.
      </p>
      <ul className="space-y-3">
        {diagnostics.map((d, i) => (
          <li key={i} className="rounded-lg border border-danger/30 bg-danger/5 p-3">
            <button
              type="button"
              className="mb-1 font-mono text-xs text-danger underline-offset-2 hover:underline"
              onClick={() => onSelectLine?.(d.line)}
            >
              Line {d.line}, column {d.column}
            </button>
            <p className="text-sm">{explain(d.message)}</p>
            <p className="mt-1 font-mono text-xs whitespace-pre-wrap text-muted-foreground">{d.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
