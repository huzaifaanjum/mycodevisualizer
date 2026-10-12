/**
 * Builds the Vercel Sandbox snapshot that every run starts from: Ubuntu + JDK 21 + tracer.jar.
 *
 *   vercel link && vercel env pull     # provides VERCEL_OIDC_TOKEN for @vercel/sandbox
 *   pnpm sandbox:snapshot
 *
 * Then set VERCEL_SANDBOX_SNAPSHOT_ID in the Vercel project to the printed id and redeploy.
 */
import { readFileSync } from "node:fs";
import { Sandbox } from "@vercel/sandbox";

const TOOLS_DIR = "/opt/mcv";

async function run(sandbox: Sandbox, script: string, sudo = false) {
  const result = await sandbox.runCommand({ cmd: "bash", args: ["-lc", script], sudo });
  const out = await result.output("both");
  if (result.exitCode !== 0) throw new Error(`Command failed (${result.exitCode}): ${script}\n${out}`);
  return out;
}

async function main() {
  const jar = readFileSync("tracer/build/tracer.jar");
  const sandbox = await Sandbox.create({ resources: { vcpus: 2 }, timeout: 15 * 60 * 1000 });
  try {
    console.log("Installing JDK 21…");
    await run(sandbox, "apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq openjdk-21-jdk-headless", true);
    await sandbox.writeFiles([{ path: "/tmp/tracer.jar", content: jar }]);
    await run(sandbox, `mkdir -p ${TOOLS_DIR} && mv /tmp/tracer.jar ${TOOLS_DIR}/tracer.jar && chmod 0755 ${TOOLS_DIR} && chmod 0444 ${TOOLS_DIR}/tracer.jar`, true);

    console.log("Smoke test…");
    await sandbox.writeFiles([
      { path: "source.java", content: Buffer.from('public class Main { public static void main(String[] a) { int x = 1; System.out.println(x); } }') },
      { path: "stdin.txt", content: Buffer.from("") },
    ]);
    const smoke = await run(sandbox, `java -jar ${TOOLS_DIR}/tracer.jar --source source.java --stdin stdin.txt && rm -f source.java stdin.txt`);
    if (!smoke.includes('"status":"ok"')) throw new Error(`Smoke test failed:\n${smoke}`);

    const snapshot = await sandbox.snapshot({ expiration: 0 });
    console.log(`\nSnapshot ready. Set this in your Vercel project:\nVERCEL_SANDBOX_SNAPSHOT_ID=${snapshot.snapshotId}`);
  } catch (err) {
    await sandbox.stop().catch(() => undefined);
    throw err;
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
