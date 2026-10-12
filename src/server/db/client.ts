import "server-only";
import { MongoClient, type Db } from "mongodb";
import { getConfig } from "@/server/env";
import { AppError } from "@/server/security/errors";

const globalForMongo = globalThis as unknown as { __mcvMongo?: Promise<MongoClient> };

/** One shared client per server instance (survives hot reloads in development). */
export function getMongoClient(): Promise<MongoClient> {
  const { env, features } = getConfig();
  if (!features.database || !env.MONGODB_URI) {
    throw new AppError("SERVICE_UNAVAILABLE", "Saving is not available right now.");
  }
  globalForMongo.__mcvMongo ??= new MongoClient(env.MONGODB_URI, {
    appName: "mycodevisualizer",
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  }).connect();
  return globalForMongo.__mcvMongo;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(getConfig().env.MONGODB_DB);
}
