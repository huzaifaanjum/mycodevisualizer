import { normalizeExplanation } from "./groq.provider";
import { buildUserMessage } from "./master-prompt";

const reply = (lines: { line: number; explain: string; brief: string }[]) => ({
  summary: "  We add numbers.  ",
  keyInsights: [
    { title: "Running total", detail: "sum holds the total so far." },
    { title: "", detail: "dropped: no title" },
  ],
  lines,
  closing: "Nice!",
});

describe("normalizeExplanation", () => {
  it("drops lines outside the code and duplicates, and sorts by line", () => {
    const result = normalizeExplanation(
      reply([
        { line: 5, explain: "Loop.", brief: "Again." },
        { line: 3, explain: "Start.", brief: "Start again." },
        { line: 5, explain: "Duplicate.", brief: "Dup." },
        { line: 99, explain: "Invented line.", brief: "Nope." },
        { line: 0, explain: "Zero.", brief: "Nope." },
      ]),
      10,
    );
    expect(result.lines.map((l) => [l.line, l.explain])).toEqual([
      [3, "Start."],
      [5, "Loop."],
    ]);
  });

  it("trims text, clips overlong text and fills an empty brief from the explanation", () => {
    const result = normalizeExplanation(reply([{ line: 1, explain: "x".repeat(500), brief: "" }]), 3);
    expect(result.summary).toBe("We add numbers.");
    expect(result.lines[0]?.explain.length).toBe(400);
    expect(result.lines[0]?.brief.length).toBe(120);
    expect(result.keyInsights).toHaveLength(1);
  });

  it("rejects a reply that isn't the expected shape", () => {
    expect(() => normalizeExplanation({ summary: "hi" }, 3)).toThrow();
  });
});

describe("buildUserMessage", () => {
  it("numbers every line in the margin and fences code and input as data", () => {
    const message = buildUserMessage({ language: "java", code: "class A {\n  int x = 1;\n}", stdin: "" });
    expect(message).toContain("1 | class A {\n2 |   int x = 1;\n3 | }");
    expect(message).toContain("<<<CODE");
    expect(message).toContain("<<<INPUT\n(none)\nINPUT>>>");
    expect(message).toContain("student's own code");
  });

  it("includes the example title and description when given", () => {
    const message = buildUserMessage({
      language: "java",
      code: "class A {}",
      stdin: "",
      context: { title: "Add up an array", description: "Sum four numbers." },
    });
    expect(message).toContain("Example title: Add up an array");
  });
});
