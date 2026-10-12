import { PublicIdSchema, UpdateSnippetSchema } from "@/shared/api";
import { getSnippetService, resolveIdentity } from "@/server/context";
import { json, route } from "@/server/http/route";
import { assertSameOriginJson, readJsonBody } from "@/server/security/request";

type Ctx = { params: Promise<{ publicId: string }> };

export const GET = route(async (request: Request, { params }: Ctx) => {
  const publicId = PublicIdSchema.parse((await params).publicId);
  return json(await getSnippetService().get(publicId, await resolveIdentity(request)));
});

export const PATCH = route(async (request: Request, { params }: Ctx) => {
  assertSameOriginJson(request);
  const publicId = PublicIdSchema.parse((await params).publicId);
  const { title } = UpdateSnippetSchema.parse(await readJsonBody(request, 1024));
  await getSnippetService().rename(publicId, title, await resolveIdentity(request));
  return json({ ok: true });
});

export const DELETE = route(async (request: Request, { params }: Ctx) => {
  assertSameOriginJson(request);
  const publicId = PublicIdSchema.parse((await params).publicId);
  await getSnippetService().remove(publicId, await resolveIdentity(request));
  return json({ ok: true });
});
