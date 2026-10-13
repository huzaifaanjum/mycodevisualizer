import { spokenStep } from "./narration-script";

describe("spokenStep", () => {
  it("names the line that ran, reads its effects, then the line that runs next", () => {
    const text = spokenStep(
      [
        { kind: "change", text: "sum changed from 12 to 27." },
        { kind: "next", text: "Next, line 5 runs." },
      ],
      6,
    );
    expect(text).toBe("Line 6 ran. sum changed from 12 to 27. Next, line 5 runs.");
  });

  it("has no line that ran on the first step", () => {
    const text = spokenStep(
      [
        { kind: "start", text: "The program starts in main()." },
        { kind: "next", text: "Next, line 3 runs." },
      ],
      undefined,
    );
    expect(text).toBe("The program starts in main(). Next, line 3 runs.");
  });
});
