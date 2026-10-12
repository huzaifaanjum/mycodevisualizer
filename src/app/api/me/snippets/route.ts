import { getSnippetService, resolveIdentity } from "@/server/context";
import { json, route } from "@/server/http/route";

export const GET = route(async (request: Request) =>
  json(await getSnippetService().listMine(await resolveIdentity(request))),
);
