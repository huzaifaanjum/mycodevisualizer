import { z } from "zod";

/** Every API error uses this envelope. Codes are stable; messages are safe to show to users. */
export const ERROR_CODES = [
  "BAD_REQUEST",
  "VALIDATION_FAILED",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_FEATURE",
  "EXECUTION_FAILED",
  "SERVICE_UNAVAILABLE",
  "INTERNAL",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    retryAfterSeconds: z.number().optional(),
    fields: z.record(z.string(), z.array(z.string())).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
