import "server-only";
import { customAlphabet } from "nanoid";
import type { CreateSnippetInput, SnippetDto, SnippetSummaryDto } from "@/shared/api";
import { RATE_LIMITS } from "@/shared/constants";
import type { SnippetDoc } from "@/server/db/collections";
import type { snippetsRepository as SnippetsRepository } from "@/server/repositories/snippets.repository";
import { AppError } from "@/server/security/errors";
import type { RateLimiter } from "@/server/security/rate-limit";
import type { Identity } from "./identity";

const newPublicId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-", 10);

export interface SnippetServiceDeps {
  repository: typeof SnippetsRepository;
  rateLimiter: RateLimiter;
  rateLimitMultiplier?: number;
}

function defaultTitle(code: string): string {
  const match = /class\s+(\w+)/.exec(code);
  return match?.[1] ? `${match[1]}.java` : "Untitled snippet";
}

function toDto(doc: SnippetDoc, viewer: Identity | null): SnippetDto {
  return {
    publicId: doc.publicId,
    language: doc.language,
    title: doc.title,
    code: doc.code,
    stdin: doc.stdin,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    isOwner: viewer?.kind === "user" && doc.ownerId === viewer.userId,
  };
}

/** Snippets are public-by-link. Only owners can rename or delete; checked here, not in the UI. */
export function createSnippetService({ repository, rateLimiter, rateLimitMultiplier = 1 }: SnippetServiceDeps) {
  return {
    async create(input: CreateSnippetInput, identity: Identity): Promise<{ publicId: string }> {
      await rateLimiter.check({ name: "snippets", limit: RATE_LIMITS.snippetsPerHour * rateLimitMultiplier, windowMs: 3_600_000 }, identity.key);
      const doc = await repository.insert({
        publicId: newPublicId(),
        language: input.language,
        title: input.title ?? defaultTitle(input.code),
        code: input.code,
        stdin: input.stdin,
        ownerId: identity.kind === "user" ? identity.userId : null,
      });
      return { publicId: doc.publicId };
    },

    async get(publicId: string, viewer: Identity | null): Promise<SnippetDto> {
      const doc = await repository.findByPublicId(publicId);
      if (!doc) throw new AppError("NOT_FOUND", "This snippet doesn't exist or was deleted.");
      await repository.incrementViews(publicId).catch(() => undefined);
      return toDto(doc, viewer);
    },

    async listMine(identity: Identity): Promise<SnippetSummaryDto[]> {
      if (identity.kind !== "user") throw new AppError("UNAUTHORIZED", "Sign in to see your snippets.");
      const docs = await repository.listByOwner(identity.userId);
      return docs.map((d) => ({
        publicId: d.publicId,
        language: d.language,
        title: d.title,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      }));
    },

    async rename(publicId: string, title: string, identity: Identity): Promise<void> {
      if (identity.kind !== "user") throw new AppError("UNAUTHORIZED", "Sign in to rename snippets.");
      const ok = await repository.renameOwned(publicId, identity.userId, title);
      if (!ok) throw new AppError("NOT_FOUND", "Snippet not found.");
    },

    async remove(publicId: string, identity: Identity): Promise<void> {
      if (identity.kind !== "user") throw new AppError("UNAUTHORIZED", "Sign in to delete snippets.");
      const ok = await repository.deleteOwned(publicId, identity.userId);
      if (!ok) throw new AppError("NOT_FOUND", "Snippet not found.");
    },
  };
}
