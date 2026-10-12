import "server-only";
import { NextResponse } from "next/server";
import { toApiError } from "@/server/security/errors";

type Handler<Ctx> = (request: Request, context: Ctx) => Promise<Response>;

/** Wraps a route handler so every error becomes the standard JSON error envelope. */
export function route<Ctx>(handler: Handler<Ctx>): Handler<Ctx> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      const { status, body } = toApiError(err);
      const headers: HeadersInit = { "Cache-Control": "no-store" };
      if (body.error.retryAfterSeconds !== undefined) {
        Object.assign(headers, { "Retry-After": String(body.error.retryAfterSeconds) });
      }
      return NextResponse.json(body, { status, headers });
    }
  };
}

export function json<T>(data: T, init: { status?: number; cache?: "no-store" | "public" } = {}): Response {
  return NextResponse.json(data, {
    status: init.status ?? 200,
    headers: {
      "Cache-Control": init.cache === "public" ? "public, max-age=300, s-maxage=3600" : "no-store",
    },
  });
}
