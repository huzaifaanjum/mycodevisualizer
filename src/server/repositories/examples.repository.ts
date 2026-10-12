import "server-only";
import { collections, type ExampleDoc } from "@/server/db/collections";

const PROJECTION = { _id: 0 } as const;

export const examplesRepository = {
  async findAll(): Promise<ExampleDoc[]> {
    const { examples } = await collections();
    return examples.find({}, { projection: PROJECTION }).sort({ order: 1 }).toArray();
  },

  async findBySlug(slug: string): Promise<ExampleDoc | null> {
    const { examples } = await collections();
    return examples.findOne({ slug: { $eq: slug } }, { projection: PROJECTION });
  },

  async upsertMany(docs: ExampleDoc[]): Promise<number> {
    const { examples } = await collections();
    if (docs.length === 0) return 0;
    const result = await examples.bulkWrite(
      docs.map((doc) => ({ replaceOne: { filter: { slug: { $eq: doc.slug } }, replacement: doc, upsert: true } })),
    );
    return result.upsertedCount + result.modifiedCount;
  },
};
