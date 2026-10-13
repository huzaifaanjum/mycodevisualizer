import { z } from "zod";
import { AppError, describeError, toApiError } from "./errors";
import { getClientIp, hashIdentifier } from "./ip";
import { assertSameOriginJson, readJsonBody } from "./request";

function post(headers: Record<string, string>, body = "{}", method = "POST"): Request {
  return new Request("https://app.test/api/run", {
    method,
    headers,
    body: method === "DELETE" ? null : body,
  });
}

describe("toApiError", () => {
  it("maps AppError to its status and safe fields", () => {
    const err = new AppError("RATE_LIMITED", "Slow down.", {
      retryAfterSeconds: 30,
      fields: { code: ["x"] },
    });
    expect(toApiError(err)).toEqual({
      status: 429,
      body: {
        error: {
          code: "RATE_LIMITED",
          message: "Slow down.",
          retryAfterSeconds: 30,
          fields: { code: ["x"] },
        },
      },
    });
  });

  it("maps ZodError to VALIDATION_FAILED with per-field messages", () => {
    const result = z.object({ title: z.string() }).safeParse({ title: 1 });
    if (result.success) throw new Error("expected failure");
    const { status, body } = toApiError(result.error);
    expect(status).toBe(422);
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(body.error.fields?.title).toHaveLength(1);
  });

  it("hides unexpected errors behind a generic message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { status, body } = toApiError(new Error("db password leaked"));
    expect(status).toBe(500);
    expect(body.error).toEqual({ code: "INTERNAL", message: "Something went wrong. Please try again." });
    spy.mockRestore();
  });
});

describe("describeError", () => {
  it("walks the cause chain, includes json bodies and truncates", () => {
    const inner = Object.assign(new Error("bad gateway"), { json: { reason: "quota" } });
    const outer = new Error("sandbox failed", { cause: inner });
    expect(describeError(outer)).toBe('Error: sandbox failed <- Error: bad gateway {"reason":"quota"}');
    expect(describeError("plain")).toBe("plain");
    expect(describeError(outer, 10)).toHaveLength(10);
  });
});

describe("ip helpers", () => {
  it("prefers the first forwarded address, then x-real-ip", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": " 1.2.3.4 , 5.6.7.8" }))).toBe("1.2.3.4");
    expect(getClientIp(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(getClientIp(new Headers())).toBe("unknown");
  });

  it("hashes deterministically per salt", () => {
    expect(hashIdentifier("1.2.3.4", "a")).toBe(hashIdentifier("1.2.3.4", "a"));
    expect(hashIdentifier("1.2.3.4", "a")).not.toBe(hashIdentifier("1.2.3.4", "b"));
    expect(hashIdentifier("1.2.3.4", "a")).toHaveLength(32);
  });
});

describe("assertSameOriginJson", () => {
  const json = { "content-type": "application/json", host: "app.test" };

  it("accepts same-origin JSON and DELETE without a body type", () => {
    expect(() => assertSameOriginJson(post({ ...json, origin: "https://app.test" }))).not.toThrow();
    expect(() => assertSameOriginJson(post({ host: "app.test" }, "", "DELETE"))).not.toThrow();
  });

  it("rejects cross-origin, malformed origins and non-JSON bodies", () => {
    expect(() => assertSameOriginJson(post({ ...json, origin: "https://evil.test" }))).toThrow(AppError);
    expect(() => assertSameOriginJson(post({ ...json, origin: "not a url" }))).toThrow(AppError);
    expect(() => assertSameOriginJson(post({ "content-type": "text/plain", host: "app.test" }))).toThrow(
      "Requests must be sent as JSON.",
    );
  });
});

describe("readJsonBody", () => {
  it("parses JSON within the size cap", async () => {
    await expect(readJsonBody(post({}, '{"a":1}'), 100)).resolves.toEqual({ a: 1 });
  });

  it("rejects oversized and malformed bodies", async () => {
    await expect(readJsonBody(post({ "content-length": "999" }, "{}"), 10)).rejects.toThrow("too large");
    await expect(readJsonBody(post({}, '{"a":"0123456789"}'), 5)).rejects.toThrow("too large");
    await expect(readJsonBody(post({}, "{nope"), 100)).rejects.toThrow("not valid JSON");
  });
});
