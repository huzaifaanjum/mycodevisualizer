import "server-only";
import { BUNDLED_EXAMPLES } from "@content/examples";
import { ExampleSchema, type Example } from "@/shared/examples";
import { getConfig } from "@/server/env";
import { examplesRepository } from "@/server/repositories/examples.repository";

const bundled: Example[] = BUNDLED_EXAMPLES.map((e) => ExampleSchema.parse(e)).sort((a, b) => a.order - b.order);

/**
 * Examples live in MongoDB (seeded from /content/examples) so they can be curated without a deploy.
 * If the database is unavailable the bundled copy is served, so the tool never loses its examples.
 */
export const exampleService = {
  async list(): Promise<Example[]> {
    if (!getConfig().features.database) return bundled;
    try {
      const docs = await examplesRepository.findAll();
      return docs.length ? docs.map((d) => ExampleSchema.parse(d)) : bundled;
    } catch (err) {
      console.error("Falling back to bundled examples", err);
      return bundled;
    }
  },

  async get(slug: string): Promise<Example | null> {
    const fromBundle = bundled.find((e) => e.slug === slug) ?? null;
    if (!getConfig().features.database) return fromBundle;
    try {
      const doc = await examplesRepository.findBySlug(slug);
      return doc ? ExampleSchema.parse(doc) : fromBundle;
    } catch (err) {
      console.error("Falling back to bundled example", err);
      return fromBundle;
    }
  },

  bundled(): Example[] {
    return bundled;
  },
};
