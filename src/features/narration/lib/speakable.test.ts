import { LIMITS } from "@/shared/constants";
import { speakable } from "./speakable";

describe("speakable", () => {
  it.each([
    ["nums[i] changed from 4 to 8.", "nums at index i changed from 4 to 8."],
    ['shopping[0] was replaced: "milk" → "oat milk".', 'shopping at index 0 was replaced: "milk" becomes "oat milk".'],
    ["The for condition i <= 5 is true (i = 3), so its body runs.", "The for condition i is less than or equal to 5 is true (i = 3), so its body runs."],
    ["The loop body finished. i++ runs, then the condition is checked again.", "The loop body finished. i plus plus runs, then the condition is checked again."],
    ["The program starts in main(). A frame for it is placed on the call stack.", "The program starts in main. A frame for it is placed on the call stack."],
    ["this.top changed from 0 to 1.", "this dot top changed from 0 to 1."],
    ["The program printed int[3].", "The program printed int array of length 3."],
    ["n % 2 == 0 && n != 4", "n mod 2 equals 0 and n is not equal to 4"],
  ])("reads %s naturally", (input, expected) => {
    expect(speakable(input)).toBe(expected);
  });

  it("leaves decimals and plain prose alone", () => {
    expect(speakable("average changed from 0.0 to 25.0.")).toBe("average changed from 0.0 to 25.0.");
  });

  it("cuts long text at a sentence end within the limit", () => {
    const long = "This sentence is short. ".repeat(60);
    const spoken = speakable(long);
    expect(spoken.length).toBeLessThanOrEqual(LIMITS.maxNarrationChars);
    expect(spoken.endsWith(".")).toBe(true);
  });
});
