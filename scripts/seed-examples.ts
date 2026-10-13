/**
 * Upserts the bundled examples in /content/examples into MongoDB:
 *   yarn db:seed
 */
import { getMongoClient } from "@/server/db/client";
import { examplesRepository } from "@/server/repositories/examples.repository";
import { exampleService } from "@/server/services/example.service";

async function main() {
  const examples = exampleService.bundled();
  const changed = await examplesRepository.upsertMany(examples);
  console.log(`Seeded ${examples.length} examples (${changed} inserted or updated).`);
  await (await getMongoClient()).close();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
