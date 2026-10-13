import { DIFFICULTIES } from "@/shared/constants";
import type { Example } from "@/shared/examples";

export const EXAMPLE_SORTS = [
  { id: "recommended", label: "Recommended" },
  { id: "easiest", label: "Easiest first" },
  { id: "hardest", label: "Hardest first" },
  { id: "title", label: "Title (A–Z)" },
] as const;
export type ExampleSort = (typeof EXAMPLE_SORTS)[number]["id"];

export function isExampleSort(value: string): value is ExampleSort {
  return EXAMPLE_SORTS.some((s) => s.id === value);
}

const level = (e: Example) => DIFFICULTIES.indexOf(e.difficulty);

/** Returns a sorted copy. Ties keep the recommended (curriculum) order. */
export function sortExamples(examples: readonly Example[], sort: ExampleSort): Example[] {
  const byOrder = (a: Example, b: Example) => a.order - b.order;
  const copy = [...examples];
  switch (sort) {
    case "recommended":
      return copy.sort(byOrder);
    case "easiest":
      return copy.sort((a, b) => level(a) - level(b) || byOrder(a, b));
    case "hardest":
      return copy.sort((a, b) => level(b) - level(a) || byOrder(a, b));
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title) || byOrder(a, b));
    default: {
      const unreachable: never = sort;
      return unreachable;
    }
  }
}
