/**
 * Builds the Vercel Sandbox snapshot that every run starts from: Ubuntu + JDK 21 + tracer.jar.
 * The app also does this by itself when its snapshot is missing or outdated; this script lets you do
 * it ahead of time.
 *
 *   vercel link && vercel env pull .env.local   # provides VERCEL_OIDC_TOKEN for @vercel/sandbox
 *   pnpm sandbox:snapshot
 *
 * With MONGODB_URI set, the snapshot is recorded in the database and picked up by every instance.
 * Otherwise set VERCEL_SANDBOX_SNAPSHOT_ID in the Vercel project to the printed id.
 */
import { getMongoClient } from "@/server/db/client";
import { getConfig } from "@/server/env";
import { buildRuntimeSnapshot } from "@/server/execution/runtime-snapshot";
import { mongoRuntimeStore } from "@/server/repositories/runtime.repository";

async function main() {
  console.log("Building runtime snapshot (about a minute)…");
  const record = await buildRuntimeSnapshot();
  console.log(`Snapshot ready: ${record.snapshotId} (tracer ${record.tracerHash})`);
  if (getConfig().features.database) {
    await mongoRuntimeStore.set(record);
    console.log("Recorded in MongoDB; all instances will use it.");
    await (await getMongoClient()).close();
  } else {
    console.log(`Set VERCEL_SANDBOX_SNAPSHOT_ID=${record.snapshotId} in your Vercel project.`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
