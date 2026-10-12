import "server-only";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { Sandbox } from "@vercel/sandbox";

export const SANDBOX_TOOLS_DIR = "/opt/mcv";
const TRACER_SOURCE_ROOT = join(process.cwd(), "tracer", "src", "main", "java");

export interface RuntimeRecord {
  snapshotId: string;
  tracerHash: string;
  createdAt: Date;
}

/** Where the current runtime snapshot id is recorded so every server instance shares it. */
export interface RuntimeRecordStore {
  get(): Promise<RuntimeRecord | null>;
  set(record: RuntimeRecord): Promise<void>;
}

interface TracerSource {
  path: string;
  content: string;
}

async function listJavaFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => (e.isDirectory() ? listJavaFiles(join(dir, e.name)) : Promise.resolve(e.name.endsWith(".java") ? [join(dir, e.name)] : []))),
  );
  return nested.flat().sort();
}

/** Tracer sources shipped with the deployment (see outputFileTracingIncludes in next.config.ts). */
export async function readTracerSources(): Promise<TracerSource[]> {
  const files = await listJavaFiles(TRACER_SOURCE_ROOT);
  return Promise.all(files.map(async (f) => ({ path: relative(TRACER_SOURCE_ROOT, f), content: await readFile(f, "utf8") })));
}

export function hashSources(sources: TracerSource[]): string {
  const hash = createHash("sha256");
  for (const s of sources) hash.update(s.path).update("\0").update(s.content).update("\0");
  return hash.digest("hex").slice(0, 16);
}

/**
 * Builds a fresh runtime: Ubuntu sandbox + JDK 21 + tracer.jar compiled from the deployed sources,
 * smoke-tested, then snapshotted with no expiry. Takes about a minute.
 */
export async function buildRuntimeSnapshot(): Promise<RuntimeRecord> {
  const sources = await readTracerSources();
  if (sources.length === 0) throw new Error("Tracer sources were not bundled with the deployment.");
  const sandbox = await Sandbox.create({ resources: { vcpus: 2 }, timeout: 10 * 60 * 1000 });
  const run = async (script: string, sudo = false) => {
    const result = await sandbox.runCommand({ cmd: "bash", args: ["-lc", script], sudo });
    if (result.exitCode !== 0) throw new Error(`Runtime build step failed: ${script}\n${await result.output("both")}`);
    return result.stdout();
  };
  try {
    await run(
      "apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends openjdk-21-jdk-headless && apt-get clean && rm -rf /var/lib/apt/lists/*",
      true,
    );
    await sandbox.writeFiles(sources.map((s) => ({ path: `/tmp/tracer-src/${s.path}`, content: Buffer.from(s.content, "utf8") })));
    await run(
      [
        "cd /tmp/tracer-src && mkdir -p /tmp/tracer-classes",
        "javac --release 21 -d /tmp/tracer-classes $(find . -name '*.java')",
        "jar --create --file /tmp/tracer.jar --main-class dev.mycodevisualizer.tracer.Main -C /tmp/tracer-classes .",
      ].join(" && "),
    );
    await run(
      `mkdir -p ${SANDBOX_TOOLS_DIR} && mv /tmp/tracer.jar ${SANDBOX_TOOLS_DIR}/tracer.jar && chmod 0755 ${SANDBOX_TOOLS_DIR} && chmod 0444 ${SANDBOX_TOOLS_DIR}/tracer.jar && rm -rf /tmp/tracer-src /tmp/tracer-classes`,
      true,
    );
    await sandbox.writeFiles([
      { path: "smoke.java", content: Buffer.from("public class Main {\n  public static void main(String[] a) {\n    int x = 1;\n  }\n}\n") },
    ]);
    const smoke = await run(`java -jar ${SANDBOX_TOOLS_DIR}/tracer.jar --source smoke.java && rm -f smoke.java`);
    if (!smoke.includes('"status":"ok"')) throw new Error(`Runtime smoke test failed: ${smoke.slice(0, 500)}`);
    const snapshot = await sandbox.snapshot({ expiration: 0 });
    return { snapshotId: snapshot.snapshotId, tracerHash: hashSources(sources), createdAt: new Date() };
  } catch (err) {
    await sandbox.stop().catch(() => undefined);
    throw err;
  }
}
