import "server-only";
import { collections } from "@/server/db/collections";
import type { RuntimeRecordStore } from "@/server/execution/runtime-snapshot";

const RECORD_ID = "java-runtime";

export const mongoRuntimeStore: RuntimeRecordStore = {
  async get() {
    const { runtime } = await collections();
    const doc = await runtime.findOne({ _id: RECORD_ID });
    return doc ? { snapshotId: doc.snapshotId, tracerHash: doc.tracerHash, createdAt: doc.createdAt } : null;
  },
  async set(record) {
    const { runtime } = await collections();
    await runtime.updateOne({ _id: RECORD_ID }, { $set: record }, { upsert: true });
  },
};
