import "server-only";
import { ObjectId } from "mongodb";
import type { AccentId } from "@/shared/constants";
import { collections } from "@/server/db/collections";

function toObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export const usersRepository = {
  async getAccent(userId: string): Promise<AccentId | null> {
    const _id = toObjectId(userId);
    if (!_id) return null;
    const { users } = await collections();
    const user = await users.findOne({ _id }, { projection: { preferences: 1 } });
    return user?.preferences?.accent ?? null;
  },

  async setAccent(userId: string, accent: AccentId): Promise<void> {
    const _id = toObjectId(userId);
    if (!_id) return;
    const { users } = await collections();
    await users.updateOne({ _id }, { $set: { "preferences.accent": accent } });
  },
};
