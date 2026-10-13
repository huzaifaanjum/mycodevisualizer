import { ExplainRequestSchema } from "@/shared/api";
import { LIMITS } from "@/shared/constants";
import { getExplanationService, resolveIdentity } from "@/server/context";
import { json, route } from "@/server/http/route";
import { assertSameOriginJson, readJsonBody } from "@/server/security/request";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST /api/explanations: a plain-English, line-by-line AI explanation of a program (Groq). */
export const POST = route(async (request: Request) => {
  assertSameOriginJson(request);
  const body = await readJsonBody(request, LIMITS.maxExplainCodeBytes + LIMITS.maxStdinBytes + 4096);
  const input = ExplainRequestSchema.parse(body);
  const identity = await resolveIdentity(request);
  const explanation = await getExplanationService().explain(input, identity);
  return json(explanation);
});
