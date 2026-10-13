import { javaAdapter } from "./adapter";
import { explainJavaDiagnostic, explainJavaException } from "./explanations";
import { findUnsupportedJavaFeatures, stripCommentsAndStrings } from "./unsupported";

describe("findUnsupportedJavaFeatures", () => {
  it("accepts the starter program", () => {
    expect(findUnsupportedJavaFeatures(javaAdapter.starterCode)).toEqual([]);
  });

  it("flags threads, files and processes with the line number", () => {
    const code = [
      "public class Main {",
      "  public static void main(String[] a) {",
      "    new Thread(() -> {}).start();",
      '    Runtime.getRuntime().exec("ls");',
      "  }",
      "}",
    ].join("\n");
    const issues = findUnsupportedJavaFeatures(code);
    expect(issues.map((i) => i.line)).toEqual([3, 4]);
  });

  it("ignores words inside strings and comments", () => {
    const code = 'class A { // Thread\n String s = "Files and Thread"; /* Socket */ }';
    expect(findUnsupportedJavaFeatures(code)).toEqual([]);
  });

  it("keeps line structure when stripping", () => {
    const code = 'a /* x\ny */ b\n"q"';
    expect(stripCommentsAndStrings(code).split("\n")).toHaveLength(3);
  });
});

describe("explanations", () => {
  it("explains an out-of-bounds index with the valid range", () => {
    expect(
      explainJavaException("ArrayIndexOutOfBoundsException", "Index 5 out of bounds for length 2"),
    ).toContain("Valid indexes are 0 to 1");
  });

  it("explains division by zero", () => {
    expect(explainJavaException("ArithmeticException", "/ by zero")).toContain("divided an integer by zero");
  });

  it("falls back for unknown exceptions", () => {
    expect(explainJavaException("WeirdException", "")).toContain("WeirdException");
  });

  it("rewrites common compiler messages", () => {
    expect(
      explainJavaDiagnostic("cannot find symbol\n  symbol:   variable y\n  location: class Broken"),
    ).toContain('"y"');
    expect(explainJavaDiagnostic("incompatible types: java.lang.String cannot be converted to int")).toBe(
      "A String value can't be stored in an int variable.",
    );
  });
});

describe("buildRunPlan", () => {
  it("passes limits and files to the tracer", () => {
    const plan = javaAdapter.buildRunPlan({
      code: "x",
      stdin: "1",
      toolsDir: "/opt/mcv",
      maxSteps: 10,
      timeoutMs: 2000,
    });
    expect(plan.files.map((f) => f.path)).toEqual(["source.java", "stdin.txt"]);
    expect(plan.args).toContain("/opt/mcv/tracer.jar");
    expect(plan.args.slice(-4)).toEqual(["--max-steps", "10", "--timeout-ms", "2000"]);
  });
});
