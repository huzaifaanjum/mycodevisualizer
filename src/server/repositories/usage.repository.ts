import "server-only";
import { collections, type UsageEventDoc } from "@/server/db/collections";

/** Anonymous usage counters: never stores code, input, IPs or user ids. */
export const usageRepository = {
  async record(event: Omit<UsageEventDoc, "createdAt">): Promise<void> {
    const { usageEvents } = await collections();
    await usageEvents.insertOne({ ...event, createdAt: new Date() });
  },
};
