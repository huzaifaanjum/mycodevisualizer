import { PreferencesSchema } from "@/shared/api";
import { getSessionUser } from "@/server/auth";
import { json, route } from "@/server/http/route";
import { usersRepository } from "@/server/repositories/users.repository";
import { AppError } from "@/server/security/errors";
import { assertSameOriginJson, readJsonBody } from "@/server/security/request";

export const PATCH = route(async (request: Request) => {
  assertSameOriginJson(request);
  const user = await getSessionUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Sign in to save preferences.");
  const { accent } = PreferencesSchema.parse(await readJsonBody(request, 512));
  await usersRepository.setAccent(user.id, accent);
  return json({ accent });
});
