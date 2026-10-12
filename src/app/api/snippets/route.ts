import { CreateSnippetSchema } from "@/shared/api";
import { LIMITS } from "@/shared/constants";
import { getSnippetService, resolveIdentity } from "@/server/context";
import { json, route } from "@/server/http/route";
import { assertSameOriginJson, readJsonBody } from "@/server/security/request";

/** POST /api/snippets: save code + input and return a public share id. */
export const POST = route(async (request: Request) => {
  assertSameOriginJson(request);
  const body = await readJsonBody(request, LIMITS.maxCodeBytes + LIMITS.maxStdinBytes + 1024);
  const input = CreateSnippetSchema.parse(body);
  const result = await getSnippetService().create(input, await resolveIdentity(request));
  return json(result, { status: 201 });
});
