import { analyzeLine, findBlockEnd, identifiersIn } from "./source-analysis";

const src = `public class A {
    public static void main(String[] args) {
        for (int i = 0; i < 3; i++) {
            if (i % 2 == 0) {
                System.out.println("{ even }");
            } else if (i == 1) {
                System.out.println(1);
            } else {
                System.out.println(i);
            }
        }
        while (x > 0)
            x--;
        do {
            x++;
        } while (x < 3);
    }
}`.split("\n");

describe("source analysis", () => {
  it("parses for loops with condition and update", () => {
    expect(analyzeLine(src, 3)).toEqual({ kind: "for", condition: "i < 3", update: "i++", bodyEnd: 11 });
  });

  it("parses if / else if / else and ignores braces inside strings", () => {
    expect(analyzeLine(src, 4)).toMatchObject({ kind: "if", condition: "i % 2 == 0", bodyEnd: 6 });
    expect(analyzeLine(src, 6)).toMatchObject({ kind: "else-if", condition: "i == 1", bodyEnd: 8 });
    expect(analyzeLine(src, 8)).toMatchObject({ kind: "else", bodyEnd: 10 });
  });

  it("handles brace-less while bodies and do-while", () => {
    expect(analyzeLine(src, 12)).toMatchObject({ kind: "while", condition: "x > 0", bodyEnd: 13 });
    expect(analyzeLine(src, 16)).toMatchObject({ kind: "do-while", condition: "x < 3" });
  });

  it("returns undefined for ordinary lines and out-of-range lines", () => {
    expect(analyzeLine(src, 5)).toBeUndefined();
    expect(analyzeLine(src, 99)).toBeUndefined();
  });

  it("finds block ends", () => {
    expect(findBlockEnd(src, 1)).toBe(17);
  });

  it("extracts identifiers but not members or keywords", () => {
    expect(identifiersIn("i < nums.length && done != true")).toEqual(["i", "nums", "done"]);
  });
});
