import type { Example } from "@/shared/examples";
import { isExampleSort, sortExamples } from "./sort-examples";

function example(slug: string, title: string, difficulty: Example["difficulty"], order: number): Example {
  return {
    slug,
    title,
    difficulty,
    order,
    topic: "Loops",
    language: "java",
    description: "",
    code: "x",
    stdin: "",
  };
}

const examples = [
  example("c", "Counting", "Medium", 3),
  example("a", "Arrays", "Beginner", 2),
  example("b", "Bubble", "Medium", 1),
  example("d", "Divide", "Easy", 4),
];
const slugs = (list: Example[]) => list.map((e) => e.slug);

describe("sortExamples", () => {
  it("recommended follows the curriculum order", () => {
    expect(slugs(sortExamples(examples, "recommended"))).toEqual(["b", "a", "c", "d"]);
  });

  it("sorts by difficulty, keeping curriculum order for ties", () => {
    expect(slugs(sortExamples(examples, "easiest"))).toEqual(["a", "d", "b", "c"]);
    expect(slugs(sortExamples(examples, "hardest"))).toEqual(["b", "c", "d", "a"]);
  });

  it("sorts by title", () => {
    expect(slugs(sortExamples(examples, "title"))).toEqual(["a", "b", "c", "d"]);
  });

  it("does not change the input", () => {
    sortExamples(examples, "title");
    expect(slugs(examples)).toEqual(["c", "a", "b", "d"]);
  });
});

describe("isExampleSort", () => {
  it("accepts known ids only", () => {
    expect(isExampleSort("hardest")).toBe(true);
    expect(isExampleSort("newest")).toBe(false);
  });
});
