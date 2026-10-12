import arraySum from "@tests/fixtures/traces/array-sum.json";
import factorial from "@tests/fixtures/traces/factorial.json";
import { expandTrace, TraceSchema, type Trace } from "@/shared/trace";
import { buildFlow, type MethodFlow } from "./flow-graph";

const FACTORIAL = `import java.util.Scanner;

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
}`.split("\n");

const ARRAY_SUM = `public class ArraySum {
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
}`.split("\n");

const parse = (json: unknown): Trace => expandTrace(TraceSchema.parse(json));
const fact = parse(factorial);
const sum = parse(arraySum);
const last = (t: Trace) => t.steps.length - 1;
const method = (flows: MethodFlow[], name: string) => {
  const flow = flows.find((f) => f.method === name);
  if (!flow) throw new Error(`no flow for ${name}`);
  return flow;
};
const node = (flow: MethodFlow, line: number) => flow.nodes.find((n) => n.line === line);
const edge = (flow: MethodFlow, from: number, to: number) => flow.edges.find((e) => e.from === from && e.to === to);

describe("buildFlow", () => {
  it("builds one flow per method in order of first execution", () => {
    const flows = buildFlow(fact, FACTORIAL, last(fact));
    expect(flows.map((f) => f.method)).toEqual(["main", "factorial"]);
    expect(method(flows, "factorial").signature).toBe("static int factorial(int n)");
    expect(method(flows, "factorial").totalCalls).toBe(4);
  });

  it("counts visits and labels the branches taken with this input", () => {
    const f = method(buildFlow(fact, FACTORIAL, last(fact)), "factorial");
    expect(node(f, 5)).toMatchObject({ kind: "decision", totalVisits: 4 });
    expect(node(f, 8)).toMatchObject({ kind: "return", totalVisits: 3 });
    expect(edge(f, 5, 8)).toMatchObject({ total: 3, label: "false" });
    expect(edge(f, 5, 6)).toMatchObject({ total: 1, label: "true" });
    expect(node(f, 8)?.calls).toEqual([{ method: "factorial", count: 3, total: 3 }]);
  });

  it("records calls from the caller line and shows the method end", () => {
    const main = method(buildFlow(fact, FACTORIAL, last(fact)), "main");
    expect(node(main, 14)?.calls).toEqual([{ method: "factorial", count: 1, total: 1 }]);
    expect(node(main, 14)?.totalVisits).toBe(1);
    expect(node(main, 16)?.text).toBe("end of main()");
  });

  it("shows loop repetitions and the exit", () => {
    const main = method(buildFlow(sum, ARRAY_SUM, last(sum)), "main");
    expect(node(main, 6)).toMatchObject({ kind: "loop", totalVisits: 4 });
    expect(edge(main, 6, 7)).toMatchObject({ total: 3, label: "true" });
    expect(edge(main, 7, 6)).toMatchObject({ total: 3, label: "repeat" });
    expect(edge(main, 6, 9)).toMatchObject({ total: 1, label: "false" });
  });

  it("counts only up to the current step and marks where we are", () => {
    const firstLoopBody = sum.steps.findIndex((s) => s.line === 7);
    const main = method(buildFlow(sum, ARRAY_SUM, firstLoopBody), "main");
    expect(main.currentLine).toBe(7);
    expect(main.lastEdge).toEqual({ from: 6, to: 7 });
    expect(edge(main, 6, 7)).toMatchObject({ count: 1, total: 3 });
    expect(node(main, 9)).toMatchObject({ visits: 0, totalVisits: 1 });
  });

  it("includes lines that never ran so untaken paths are visible", () => {
    const code = [
      "public class Main {",
      "    public static void main(String[] args) {",
      "        int x = 5;",
      "        if (x > 10) {",
      '            System.out.println("big");',
      "        }",
      "    }",
      "}",
    ];
    const trace = TraceSchema.parse({
      version: 1,
      language: "java",
      status: "ok",
      stdout: "",
      steps: [3, 4, 7].map((line, index) => ({
        index,
        line,
        event: index === 0 ? "call" : "step",
        frames: [{ id: "f0", method: "main", className: "Main", line, locals: [] }],
        heap: {},
        stdoutLength: 0,
        stdinConsumed: 0,
      })),
    });
    const main = method(buildFlow(trace, code, 2), "main");
    expect(node(main, 5)).toMatchObject({ totalVisits: 0 });
    expect(edge(main, 4, 7)).toMatchObject({ label: "false", total: 1 });
    expect(main.nodes.map((n) => n.line)).toEqual([3, 4, 5, 7]);
  });
});
