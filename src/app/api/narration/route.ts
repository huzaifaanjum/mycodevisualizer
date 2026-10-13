import { NarrationRequestSchema } from "@/shared/api";
import { LIMITS } from "@/shared/constants";
import { getNarrationService, resolveIdentity } from "@/server/context";
import { route } from "@/server/http/route";
import { assertSameOriginJson, readJsonBody } from "@/server/security/request";

export const runtime = "nodejs";
export const maxDuration = 30;

/** POST /api/narration: read a short text aloud with the site's ElevenLabs voice. Returns MP3 audio. */
export const POST = route(async (request: Request) => {
  assertSameOriginJson(request);
  const body = await readJsonBody(request, LIMITS.maxNarrationChars * 4 + 256);
  const input = NarrationRequestSchema.parse(body);
  const identity = await resolveIdentity(request);
  const audio = await getNarrationService().speak(input, identity);
  return new Response(Buffer.from(audio), {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" },
  });
});
