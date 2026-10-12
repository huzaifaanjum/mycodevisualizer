"use client";

import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EXAMPLE_TOPICS, type ExampleTopic } from "@/shared/constants";
import type { Example } from "@/shared/examples";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export function ExampleGrid({ examples }: { examples: Example[] }) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<ExampleTopic | "All">("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return examples.filter(
      (e) =>
        (topic === "All" || e.topic === topic) &&
        (!q || e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)),
    );
  }, [examples, query, topic]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <SearchIcon className="absolute top-2.5 left-3 size-4 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search examples" className="pl-9" aria-label="Search examples" />
        </div>
        <ToggleGroup
          type="single"
          value={topic}
          onValueChange={(v) => v && setTopic(v as ExampleTopic | "All")}
          className="flex-wrap"
          aria-label="Filter by topic"
        >
          {(["All", ...EXAMPLE_TOPICS] as const).map((t) => (
            <ToggleGroupItem key={t} value={t}>
              {t}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No examples match that search.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e) => (
            <li key={e.slug}>
              <Link
                href={`/?example=${e.slug}`}
                className="group flex h-full flex-col rounded-xl border bg-card p-4 transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="outline">{e.topic}</Badge>
                  <span
                    className={cn(
                      "text-[11px]",
                      e.difficulty === "Beginner" && "text-primary",
                      e.difficulty === "Easy" && "text-stdin",
                      e.difficulty === "Medium" && "text-changed",
                    )}
                  >
                    {e.difficulty}
                  </span>
                </div>
                <h3 className="font-semibold group-hover:text-primary">{e.title}</h3>
                <p className="mt-1 mb-3 text-sm text-muted-foreground">{e.description}</p>
                <pre className="mt-auto overflow-hidden rounded-md border bg-background p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {previewLines(e.code)}
                </pre>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Four lines from inside main() make a better preview than the class header. */
function previewLines(code: string): string {
  const lines = code.split("\n");
  const mainIndex = lines.findIndex((l) => l.includes("static void main"));
  const start = mainIndex >= 0 ? mainIndex + 1 : 0;
  return lines
    .slice(start, start + 4)
    .map((l) => l.replace(/^ {8}/, ""))
    .join("\n");
}
