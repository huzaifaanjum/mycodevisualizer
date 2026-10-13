"use client";

import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EXAMPLE_TOPICS, type ExampleTopic } from "@/shared/constants";
import type { Example } from "@/shared/examples";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { EXAMPLE_SORTS, isExampleSort, sortExamples, type ExampleSort } from "../lib/sort-examples";

export function ExampleGrid({ examples }: { examples: Example[] }) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<ExampleTopic | "All">("All");
  const [sort, setSort] = useState<ExampleSort>("recommended");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = examples.filter(
      (e) =>
        (topic === "All" || e.topic === topic) &&
        (!q || e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)),
    );
    return sortExamples(matches, sort);
  }, [examples, query, topic, sort]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="text-muted-foreground absolute top-2.5 left-3 size-4" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search examples"
              className="pl-9"
              aria-label="Search examples"
            />
          </div>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "example" : "examples"}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-muted-foreground text-sm" id="sort-label">
              Sort by
            </span>
            <Select value={sort} onValueChange={(v) => isExampleSort(v) && setSort(v)}>
              <SelectTrigger aria-labelledby="sort-label" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXAMPLE_SORTS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ToggleGroup
          type="single"
          value={topic}
          onValueChange={(v) => v && setTopic(v as ExampleTopic | "All")}
          className="flex-wrap justify-start"
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
        <p className="text-muted-foreground text-sm">No examples match that search.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e) => (
            <li key={e.slug}>
              <Link
                href={`/?example=${e.slug}`}
                className="group bg-card hover:border-primary/60 focus-visible:ring-ring flex h-full flex-col rounded-xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
                <h3 className="group-hover:text-primary font-semibold">{e.title}</h3>
                <p className="text-muted-foreground mt-1 mb-3 line-clamp-3 text-sm">{e.description}</p>
                <pre className="bg-background text-muted-foreground mt-auto overflow-hidden rounded-md border p-2 font-mono text-[11px] leading-relaxed">
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
