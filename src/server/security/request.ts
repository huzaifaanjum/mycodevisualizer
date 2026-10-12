import "server-only";
import { AppError } from "./errors";

/**
 * Mutating endpoints only accept same-origin JSON. Browsers always send Origin on cross-site POSTs,
 * so checking it blocks CSRF; requiring application/json blocks simple-form submissions.
 */
export function assertSameOriginJson(request: Request): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new AppError("FORBIDDEN", "Cross-origin requests are not allowed.");
    }
    if (originHost !== host) throw new AppError("FORBIDDEN", "Cross-origin requests are not allowed.");
  }
  const type = request.headers.get("content-type") ?? "";
  if (request.method !== "DELETE" && !type.toLowerCase().startsWith("application/json")) {
    throw new AppError("BAD_REQUEST", "Requests must be sent as JSON.");
  }
}

/** Reads a JSON body with a hard size cap (protects against huge payloads before parsing). */
export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new AppError("PAYLOAD_TOO_LARGE", "The request is too large.");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new AppError("PAYLOAD_TOO_LARGE", "The request is too large.");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AppError("BAD_REQUEST", "The request body is not valid JSON.");
  }
}
