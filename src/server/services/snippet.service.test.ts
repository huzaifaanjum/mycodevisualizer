import type { SnippetDoc } from "@/server/db/collections";
import type { snippetsRepository } from "@/server/repositories/snippets.repository";
import { MemoryRateLimitStore, RateLimiter } from "@/server/security/rate-limit";
import { anonymousIdentity, userIdentity } from "./identity";
import { createSnippetService } from "./snippet.service";

function memoryRepo(): typeof snippetsRepository {
  const docs: SnippetDoc[] = [];
  return {
    insert: async (s) => {
      const doc = { ...s, views: 0, createdAt: new Date(0), updatedAt: new Date(0) };
      docs.push(doc);
      return doc;
    },
    findByPublicId: async (id) => docs.find((d) => d.publicId === id) ?? null,
    incrementViews: async () => undefined,
    listByOwner: async (owner) => docs.filter((d) => d.ownerId === owner),
    renameOwned: async (id, owner, title) => {
      const d = docs.find((x) => x.publicId === id && x.ownerId === owner);
      if (d) d.title = title;
      return Boolean(d);
    },
    deleteOwned: async (id, owner) => {
      const i = docs.findIndex((x) => x.publicId === id && x.ownerId === owner);
      if (i >= 0) docs.splice(i, 1);
      return i >= 0;
    },
  };
}

const input = { language: "java" as const, code: "public class Hello {}", stdin: "1" };

describe("snippet service", () => {
  const make = () => createSnippetService({ repository: memoryRepo(), rateLimiter: new RateLimiter(new MemoryRateLimitStore()) });

  it("creates anonymous snippets with a 10-char URL-safe id and a default title", async () => {
    const service = make();
    const { publicId } = await service.create(input, anonymousIdentity("ip"));
    expect(publicId).toMatch(/^[A-Za-z0-9_-]{10}$/);
    const dto = await service.get(publicId, null);
    expect(dto).toMatchObject({ title: "Hello.java", isOwner: false, stdin: "1" });
  });

  it("only lets the owner rename and delete", async () => {
    const service = make();
    const owner = userIdentity("alice");
    const { publicId } = await service.create(input, owner);
    expect((await service.get(publicId, owner)).isOwner).toBe(true);
    await expect(service.rename(publicId, "x", userIdentity("mallory"))).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.remove(publicId, anonymousIdentity("ip"))).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await service.rename(publicId, "Renamed", owner);
    expect((await service.listMine(owner))[0]?.title).toBe("Renamed");
    await service.remove(publicId, owner);
    await expect(service.get(publicId, owner)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("requires sign-in to list snippets", async () => {
    await expect(make().listMine(anonymousIdentity("ip"))).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rate limits snippet creation", async () => {
    const service = make();
    for (let i = 0; i < 10; i++) await service.create(input, anonymousIdentity("spam"));
    await expect(service.create(input, anonymousIdentity("spam"))).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
});
