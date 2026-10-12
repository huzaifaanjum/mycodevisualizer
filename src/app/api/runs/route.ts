import { RunRequestSchema } from "@/shared/api";
import { LIMITS } from "@/shared/constants";
import { getRunService, resolveIdentity } from "@/server/context";
import { json, route } from "@/server/http/route";
import { assertSameOriginJson, readJsonBody } from "@/server/security/request";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST /api/runs: compile, run and trace a program in an isolated sandbox. */
export const POST = route(async (request: Request) => {
  assertSameOriginJson(request);
  const body = await readJsonBody(request, LIMITS.maxCodeBytes + LIMITS.maxStdinBytes + 1024);
  const input = RunRequestSchema.parse(body);
  const identity = await resolveIdentity(request);
  const trace = await getRunService().run(input, identity);
  return json(trace);
});
