import { ZodError } from "zod";
import type { ApiError, ErrorCode } from "@/shared/api";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_FAILED: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_FEATURE: 422,
  EXECUTION_FAILED: 502,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL: 500,
};

/** An expected failure whose message is safe to show to users. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly options: { retryAfterSeconds?: number; fields?: Record<string, string[]>; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
  }

  get status(): number {
    return STATUS[this.code];
  }
}

/**
 * A short, server-side-only description of an error and its causes (e.g. a Sandbox API error body),
 * for logs and failure diagnostics. Never sent to the client.
 */
export function describeError(err: unknown, maxLength = 500): string {
  const parts: string[] = [];
  let current: unknown = err;
  for (let depth = 0; current !== undefined && current !== null && depth < 4; depth++) {
    if (current instanceof Error) {
      const json = (current as { json?: unknown }).json;
      parts.push(`${current.name}: ${current.message}${json === undefined ? "" : ` ${JSON.stringify(json)}`}`);
      current = current.cause;
    } else {
      parts.push(String(current));
      current = undefined;
    }
  }
  return parts.join(" <- ").slice(0, maxLength);
}

export function toApiError(err: unknown): { status: number; body: ApiError } {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: {
        error: {
          code: err.code,
          message: err.message,
          ...(err.options.retryAfterSeconds !== undefined && { retryAfterSeconds: err.options.retryAfterSeconds }),
          ...(err.options.fields && { fields: err.options.fields }),
        },
      },
    };
  }
  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_";
      (fields[key] ??= []).push(issue.message);
    }
    const first = err.issues[0]?.message ?? "Invalid request.";
    return { status: STATUS.VALIDATION_FAILED, body: { error: { code: "VALIDATION_FAILED", message: first, fields } } };
  }
  // Unexpected: log server-side only, never leak details to the client.
  console.error("Unhandled error", err);
  return { status: 500, body: { error: { code: "INTERNAL", message: "Something went wrong. Please try again." } } };
}
