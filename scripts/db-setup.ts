/**
 * Creates MongoDB indexes (idempotent). Run after setting MONGODB_URI:
 *   yarn db:setup
 */
import { getMongoClient } from "@/server/db/client";
import { ensureIndexes } from "@/server/db/setup";

async function main() {
  const names = await ensureIndexes();
  console.log(`Indexes ready: ${names.join(", ")}`);
  await (await getMongoClient()).close();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
