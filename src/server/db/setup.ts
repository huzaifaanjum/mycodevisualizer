import "server-only";
import { collections } from "./collections";

const NINETY_DAYS_SECONDS = 90 * 24 * 60 * 60;

/** Idempotent: safe to run on every deploy. */
export async function ensureIndexes(): Promise<string[]> {
  const c = await collections();
  return Promise.all([
    c.examples.createIndex({ slug: 1 }, { unique: true, name: "slug_unique" }),
    c.examples.createIndex({ topic: 1, order: 1 }, { name: "topic_order" }),
    c.snippets.createIndex({ publicId: 1 }, { unique: true, name: "publicId_unique" }),
    c.snippets.createIndex({ ownerId: 1, createdAt: -1 }, { name: "owner_recent" }),
    c.rateLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expires_ttl" }),
    c.usageEvents.createIndex({ createdAt: 1 }, { expireAfterSeconds: NINETY_DAYS_SECONDS, name: "created_ttl" }),
  ]);
}
