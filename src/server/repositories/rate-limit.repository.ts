import "server-only";
import { collections } from "@/server/db/collections";
import type { RateLimitStore } from "@/server/security/rate-limit";

/** Atomic fixed-window counter; documents expire via a TTL index. */
export const mongoRateLimitStore: RateLimitStore = {
  async hit(key, windowMs, now) {
    const { rateLimits } = await collections();
    const doc = await rateLimits.findOneAndUpdate(
      { _id: key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(now + windowMs) } },
      { upsert: true, returnDocument: "after" },
    );
    return doc?.count ?? 1;
  },
};
