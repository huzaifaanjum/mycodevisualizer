import type { CodeExplanation } from "@/shared/api";
import { firstVisits, narrationClips, spokenStep } from "./narration-script";
import type { StepNote } from "./step-notes";

const explanation: CodeExplanation = {
  summary: "We add up four numbers.",
  keyInsights: [{ title: "Running total", detail: "sum always holds the total so far." }],
  lines: [{ line: 6, explain: "We add the current number to the total.", brief: "Add the next number." }],
  closing: "Nice work!",
};
const notes: StepNote[] = [
  { kind: "change", text: "sum changed from 12 to 27." },
  { kind: "next", text: "Next, line 6 runs." },
];

describe("spokenStep", () => {
  it("names the line that ran, reads its effects, then the line that runs next", () => {
    expect(spokenStep(notes, 7)).toBe("Line 7 ran. sum changed from 12 to 27. Next, line 6 runs.");
  });

  it("has no line that ran on the first step", () => {
    expect(spokenStep([{ kind: "start", text: "The program starts." }], undefined)).toBe("The program starts.");
  });
});

describe("narrationClips", () => {
  const base = { notes, lineThatRan: 7, nextLine: 6, explanation };

  it("falls back to the step notes without an AI explanation", () => {
    expect(narrationClips({ ...base, firstVisit: true, explanation: undefined })).toEqual([
      "Line 7 ran. sum changed from 12 to 27. Next, line 6 runs.",
    ]);
  });

  it("says what happened, then explains the next line in full on the first visit", () => {
    expect(narrationClips({ ...base, firstVisit: true })).toEqual([
      "sum changed from 12 to 27.",
      "Line 6. We add the current number to the total.",
    ]);
  });

  it("uses the short form when the line runs again", () => {
    expect(narrationClips({ ...base, firstVisit: false })[1]).toBe("Line 6. Add the next number.");
  });

  it("announces lines the AI skipped with the plain hint", () => {
    expect(narrationClips({ ...base, nextLine: 9, firstVisit: true })[1]).toBe("Next, line 9 runs.");
  });

  it("closes with the AI's wrap-up and key takeaways at the end", () => {
    const end = narrationClips({
      notes: [{ kind: "end", text: "The program finished." }],
      lineThatRan: 8,
      nextLine: undefined,
      firstVisit: false,
      explanation,
    });
    expect(end).toEqual(["The program finished.", "Nice work!", "Here's what to remember. sum always holds the total so far."]);
  });
});

describe("firstVisits", () => {
  it("records the first step index of each line", () => {
    expect([...firstVisits([3, 5, 6, 5, 6])]).toEqual([
      [3, 0],
      [5, 1],
      [6, 2],
    ]);
  });
});
