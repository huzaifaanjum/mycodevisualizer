import { sentenceAt, spokenSoFar, splitSentences } from "./subtitles";

describe("splitSentences", () => {
  it("splits on sentence ends but keeps decimals together", () => {
    expect(splitSentences("avg is 3.5 now. Next, line 6 runs! Done?")).toEqual(["avg is 3.5 now.", "Next, line 6 runs!", "Done?"]);
  });
});

describe("sentenceAt", () => {
  const sentences = ["Short.", "This one is a lot longer than the first."];

  it("follows the voice through the clip, weighted by sentence length", () => {
    expect(sentenceAt(sentences, 0)).toBe(0);
    expect(sentenceAt(sentences, 0.1)).toBe(0);
    expect(sentenceAt(sentences, 0.3)).toBe(1);
    expect(sentenceAt(sentences, 1)).toBe(1);
  });

  it("returns -1 when there is nothing to show", () => {
    expect(sentenceAt([], 0.5)).toBe(-1);
  });
});

describe("spokenSoFar", () => {
  const sentences = ["We add the next number.", "Then we check again."];

  it("reveals words one by one as the voice reaches them", () => {
    expect(spokenSoFar(sentences, 0)).toBe("We");
    expect(spokenSoFar(sentences, 0.25)).toBe("We add the");
    expect(spokenSoFar(sentences, 0.5)).toBe("We add the next number.");
  });

  it("starts the next sentence fresh", () => {
    expect(spokenSoFar(sentences, 0.6)).toBe("Then");
    expect(spokenSoFar(sentences, 1)).toBe("Then we check again.");
  });

  it("is empty with nothing to say", () => {
    expect(spokenSoFar([], 0.5)).toBe("");
  });
});
