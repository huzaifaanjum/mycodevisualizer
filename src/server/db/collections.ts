import "server-only";
import type { Collection, ObjectId } from "mongodb";
import type { AccentId, Difficulty, ExampleTopic, LanguageId } from "@/shared/constants";
import { getDb } from "./client";

export interface ExampleDoc {
  slug: string;
  title: string;
  topic: ExampleTopic;
  difficulty: Difficulty;
  language: LanguageId;
  description: string;
  code: string;
  stdin: string;
  order: number;
}

export interface SnippetDoc {
  _id?: ObjectId;
  publicId: string;
  language: LanguageId;
  title: string;
  code: string;
  stdin: string;
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  views: number;
}

export interface RateLimitDoc {
  _id: string;
  count: number;
  expiresAt: Date;
}

export interface UsageEventDoc {
  type: "run" | "share" | "example_open";
  language: LanguageId;
  status?: string;
  durationMs?: number;
  /** Server-side failure reason (infrastructure errors only; never user code or input). */
  reason?: string;
  createdAt: Date;
}

/** The Java runtime snapshot currently used for runs (one document). */
export interface RuntimeDoc {
  _id: string;
  snapshotId: string;
  tracerHash: string;
  createdAt: Date;
}

/** Auth.js owns the users collection; we only add a preferences sub-document. */
export interface UserDoc {
  _id: ObjectId;
  preferences?: { accent?: AccentId };
}

export const COLLECTIONS = {
  examples: "examples",
  snippets: "snippets",
  rateLimits: "rateLimits",
  usageEvents: "usageEvents",
  users: "users",
  runtime: "runtime",
} as const;

export async function collections(): Promise<{
  examples: Collection<ExampleDoc>;
  snippets: Collection<SnippetDoc>;
  rateLimits: Collection<RateLimitDoc>;
  usageEvents: Collection<UsageEventDoc>;
  users: Collection<UserDoc>;
  runtime: Collection<RuntimeDoc>;
}> {
  const db = await getDb();
  return {
    examples: db.collection<ExampleDoc>(COLLECTIONS.examples),
    snippets: db.collection<SnippetDoc>(COLLECTIONS.snippets),
    rateLimits: db.collection<RateLimitDoc>(COLLECTIONS.rateLimits),
    usageEvents: db.collection<UsageEventDoc>(COLLECTIONS.usageEvents),
    users: db.collection<UserDoc>(COLLECTIONS.users),
    runtime: db.collection<RuntimeDoc>(COLLECTIONS.runtime),
  };
}
