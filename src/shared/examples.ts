import { z } from "zod";
import { DIFFICULTIES, EXAMPLE_TOPICS, SUPPORTED_LANGUAGES } from "@/shared/constants";

export const ExampleSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  topic: z.enum(EXAMPLE_TOPICS),
  difficulty: z.enum(DIFFICULTIES),
  language: z.enum(SUPPORTED_LANGUAGES),
  description: z.string(),
  code: z.string().min(1),
  stdin: z.string(),
  order: z.number().int(),
});
export type Example = z.infer<typeof ExampleSchema>;
