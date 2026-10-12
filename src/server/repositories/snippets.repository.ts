import "server-only";
import { collections, type SnippetDoc } from "@/server/db/collections";

export type NewSnippet = Omit<SnippetDoc, "_id" | "views" | "createdAt" | "updatedAt">;

/** All filters use $eq so user input can never be interpreted as a query operator. */
export const snippetsRepository = {
  async insert(snippet: NewSnippet, now = new Date()): Promise<SnippetDoc> {
    const { snippets } = await collections();
    const doc: SnippetDoc = { ...snippet, views: 0, createdAt: now, updatedAt: now };
    await snippets.insertOne(doc);
    return doc;
  },

  async findByPublicId(publicId: string): Promise<SnippetDoc | null> {
    const { snippets } = await collections();
    return snippets.findOne({ publicId: { $eq: publicId } });
  },

  async incrementViews(publicId: string): Promise<void> {
    const { snippets } = await collections();
    await snippets.updateOne({ publicId: { $eq: publicId } }, { $inc: { views: 1 } });
  },

  async listByOwner(ownerId: string, limit = 100): Promise<SnippetDoc[]> {
    const { snippets } = await collections();
    return snippets
      .find({ ownerId: { $eq: ownerId } }, { projection: { code: 0, stdin: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  /** Returns true when a snippet owned by `ownerId` was renamed. */
  async renameOwned(publicId: string, ownerId: string, title: string): Promise<boolean> {
    const { snippets } = await collections();
    const result = await snippets.updateOne(
      { publicId: { $eq: publicId }, ownerId: { $eq: ownerId } },
      { $set: { title, updatedAt: new Date() } },
    );
    return result.matchedCount === 1;
  },

  /** Returns true when a snippet owned by `ownerId` was deleted. */
  async deleteOwned(publicId: string, ownerId: string): Promise<boolean> {
    const { snippets } = await collections();
    const result = await snippets.deleteOne({ publicId: { $eq: publicId }, ownerId: { $eq: ownerId } });
    return result.deletedCount === 1;
  },
};
