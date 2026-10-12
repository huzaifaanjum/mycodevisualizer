import "server-only";
import { createHmac } from "node:crypto";

/** Best-effort client IP. On Vercel, x-forwarded-for is set by the platform (first entry is the client). */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || headers.get("x-real-ip") || "unknown";
}

/** IPs are never stored; only a keyed hash used for rate limiting. */
export function hashIdentifier(value: string, salt: string): string {
  return createHmac("sha256", salt).update(value).digest("hex").slice(0, 32);
}
