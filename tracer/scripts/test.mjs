// Runs every program in src/test/programs through tracer.jar and checks src/test/expectations.json.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const jar = join(root, "build", "tracer.jar");
const expectations = JSON.parse(readFileSync(join(root, "src/test/expectations.json"), "utf8"));
let failures = 0;

for (const [name, exp] of Object.entries(expectations)) {
  const source = join(root, "src/test/programs", `${name}.java`);
  const stdinFile = join(root, "src/test/programs", `${name}.in`);
  const args = ["-jar", jar, "--source", source, "--timeout-ms", "3000"];
  if (existsSync(stdinFile)) args.push("--stdin", stdinFile);
  const trace = JSON.parse(execFileSync("java", args, { encoding: "utf8", env: { ...process.env, JAVA_TOOL_OPTIONS: "" } }));
  const last = trace.steps.at(-1);
  const problems = [];
  if (trace.status !== exp.status) problems.push(`status ${trace.status} != ${exp.status}`);
  if (exp.stdout !== undefined && trace.stdout !== exp.stdout) problems.push(`stdout ${JSON.stringify(trace.stdout)}`);
  if (exp.lastEvent && last?.event !== exp.lastEvent) problems.push(`last event ${last?.event}`);
  if (exp.minSteps && trace.steps.length < exp.minSteps) problems.push(`only ${trace.steps.length} steps`);
  if (exp.exceptionType && last?.exception?.type !== exp.exceptionType) problems.push(`exception ${last?.exception?.type}`);
  if (exp.exceptionLine && last?.exception?.line !== exp.exceptionLine) problems.push(`exception line ${last?.exception?.line}`);
  if (exp.diagnosticLines) {
    const lines = (trace.diagnostics ?? []).map((d) => d.line);
    if (JSON.stringify(lines) !== JSON.stringify(exp.diagnosticLines)) problems.push(`diagnostic lines ${lines}`);
  }
  console.log(`${problems.length ? "FAIL" : "ok  "} ${name}${problems.length ? ": " + problems.join("; ") : ""}`);
  failures += problems.length ? 1 : 0;
}
process.exit(failures ? 1 : 0);
