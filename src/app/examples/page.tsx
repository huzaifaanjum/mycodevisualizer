import type { Metadata } from "next";
import { ExampleGrid } from "@/features/examples";
import { exampleService } from "@/server/services/example.service";

export const metadata: Metadata = {
  title: "Examples",
  description: "Coding 101 Java examples you can visualize step by step: variables, loops, arrays, methods and recursion.",
};

/** Examples can be curated in MongoDB; refresh the page at most every 5 minutes. */
export const revalidate = 300;

export default async function ExamplesPage() {
  const examples = await exampleService.list();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Examples</h1>
      <p className="mt-1 mb-8 text-muted-foreground">Pick a program and watch it run. Each one focuses on one Coding 101 idea.</p>
      <ExampleGrid examples={examples} />
    </div>
  );
}
