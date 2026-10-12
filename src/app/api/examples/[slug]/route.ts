import { z } from "zod";
import { exampleService } from "@/server/services/example.service";
import { json, route } from "@/server/http/route";
import { AppError } from "@/server/security/errors";

const SlugSchema = z.string().regex(/^[a-z0-9-]{1,64}$/);

export const GET = route(async (_request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const slug = SlugSchema.parse((await params).slug);
  const example = await exampleService.get(slug);
  if (!example) throw new AppError("NOT_FOUND", "Example not found.");
  return json(example, { cache: "public" });
});
