import arraySum from "@tests/fixtures/traces/array-sum.json";
import factorial from "@tests/fixtures/traces/factorial.json";
import outOfBounds from "@tests/fixtures/traces/out-of-bounds.json";
import { expandTrace, TraceSchema, type Trace } from "@/shared/trace";
import { describeStep } from "./step-notes";

const SOURCES = {
  factorial: `import java.util.Scanner;

public class Factorial {
    static int factorial(int n) {
        if (n <= 1) {
            return 1;
        }
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int result = factorial(n);
        System.out.println(n + "! = " + result);
    }
}`,
  arraySum: `public class ArraySum {
    public static void main(String[] args) {
        int[] nums = {3, 1, 4};
        int[] alias = nums;
        int sum = 0;
        for (int i = 0; i < nums.length; i++) {
            sum += nums[i];
        }
        alias[0] = 10;
        String msg = "Sum: " + sum;
        System.out.println(msg);
    }
}`,
  outOfBounds: `public class OutOfBounds {
    public static void main(String[] args) {
        int[] a = new int[2];
        System.out.println("before");
        a[5] = 1;
        System.out.println("after");
    }
}`,
};

const parse = (json: unknown): Trace => expandTrace(TraceSchema.parse(json));

function notesFor(trace: Trace, source: string, stdin = "") {
  const lines = source.split("\n");
  return trace.steps.map((_, index) =>
    describeStep({ trace, index, sourceLines: lines, stdin, explainException: (type) => `explained ${type}` }).map((n) => n.text),
  );
}

describe("describeStep", () => {
  const fact = notesFor(parse(factorial), SOURCES.factorial, "4\n");
  const sum = notesFor(parse(arraySum), SOURCES.arraySum);
  const oob = notesFor(parse(outOfBounds), SOURCES.outOfBounds);

  it("introduces main on the first step", () => {
    expect(fact[0]?.[0]).toContain("starts in main()");
  });

  it("explains input being read and variables being created", () => {
    const all = fact.flat();
    expect(all).toContain('Scanner read "4" from the input.');
    expect(all).toContain("n was created with the value 4.");
  });

  it("explains calls with arguments and returns with values", () => {
    const all = fact.flat();
    expect(all).toContain("factorial(n = 4) was called. A new frame was added to the top of the stack.");
    expect(all).toContain("factorial returned 24 to main. Its frame was removed from the stack.");
  });

  it("explains if conditions with current values", () => {
    expect(fact.flat()).toContain("The if condition n <= 1 is false (n is 4), so its body is skipped.");
    expect(fact.flat()).toContain("The if condition n <= 1 is true (n is 1), so its body runs.");
  });

  it("explains loop entry, repetition and exit", () => {
    const all = sum.flat();
    expect(all).toContain("The loop condition i < nums.length is true (i is 0), so its body runs.");
    expect(all.some((n) => n.startsWith("The loop body finished. i++ runs"))).toBe(true);
    expect(all.some((n) => n.startsWith("The loop condition i < nums.length is false"))).toBe(true);
  });

  it("explains variable changes and array writes through an alias", () => {
    const all = sum.flat();
    expect(all).toContain("sum changed from 0 to 3.");
    expect(all).toContain("nums[0] changed from 3 to 10.");
  });

  it("explains printed output and the end of the program", () => {
    expect(sum.flat()).toContain('The program printed "Sum: 8".');
    expect(sum.at(-1)?.at(-1)).toContain("The program finished");
  });

  it("explains a runtime exception", () => {
    expect(oob.at(-1)?.at(-1)).toBe("Line 5 threw ArrayIndexOutOfBoundsException. explained ArrayIndexOutOfBoundsException");
  });

  it("returns nothing for an index outside the trace", () => {
    expect(describeStep({ trace: parse(factorial), index: 999, sourceLines: [], stdin: "", explainException: () => "" })).toEqual([]);
  });
});
