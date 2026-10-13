import { listLanguageAdapters } from "@/languages";
import { LIMITS } from "@/shared/constants";
import { ABOUT_STEPS, LIMIT_ROWS, UPCOMING_LANGUAGES, clampStep } from "./about-steps";

describe("about steps", () => {
  it("has unique ids and a title and text for every step", () => {
    expect(new Set(ABOUT_STEPS.map((s) => s.id)).size).toBe(ABOUT_STEPS.length);
    for (const step of ABOUT_STEPS) {
      expect(step.title).not.toBe("");
      expect(step.body.length).toBeGreaterThan(0);
    }
  });

  it("keeps languages separate from the creator and source code", () => {
    const ids = ABOUT_STEPS.map((s) => s.id);
    expect(ids).toContain("languages");
    expect(ids.indexOf("creator")).not.toBe(ids.indexOf("source"));
  });

  it("shows the real limits", () => {
    expect(LIMIT_ROWS[0]?.value).toBe(LIMITS.maxSteps.toLocaleString());
  });

  it("clamps step indexes to the tour", () => {
    expect(clampStep(-1)).toBe(0);
    expect(clampStep(99)).toBe(ABOUT_STEPS.length - 1);
    expect(clampStep(2)).toBe(2);
  });
});

describe("language guides", () => {
  it("every registered language explains what it supports", () => {
    const adapters = listLanguageAdapters();
    expect(adapters.map((a) => a.id)).toContain("java");
    for (const a of adapters) {
      expect(a.guide.requirements).not.toBe("");
      expect(a.guide.supported.length).toBeGreaterThan(0);
    }
  });

  it("never lists a registered language as upcoming", () => {
    const registered = new Set<string>(listLanguageAdapters().map((a) => a.id));
    for (const l of UPCOMING_LANGUAGES) expect(registered.has(l.id)).toBe(false);
  });
});
