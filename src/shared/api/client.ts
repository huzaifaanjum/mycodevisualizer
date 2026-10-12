import type { z } from "zod";
import { ApiErrorSchema, type ErrorCode } from "./errors";

/** Error thrown by apiRequest with the server's stable code and user-safe message. */
export class ApiRequestError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

/** Typed fetch wrapper used by every client feature. Validates the response body with Zod. */
export async function apiRequest<T>(
  path: string,
  options: { method?: Method; body?: unknown; schema: z.ZodType<T>; signal?: AbortSignal },
): Promise<T> {
  const res = await fetch(path, {
    method: options.method ?? "GET",
    headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    credentials: "same-origin",
  });
  const json: unknown = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ApiErrorSchema.safeParse(json);
    if (parsed.success) {
      const { code, message, retryAfterSeconds } = parsed.data.error;
      throw new ApiRequestError(code, message, retryAfterSeconds);
    }
    throw new ApiRequestError("INTERNAL", "Something went wrong. Please try again.");
  }
  const parsed = options.schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiRequestError("INTERNAL", "The server sent an unexpected response.");
  }
  return parsed.data;
}
