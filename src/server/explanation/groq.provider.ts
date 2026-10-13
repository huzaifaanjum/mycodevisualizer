import "server-only";
import { z } from "zod";
import { CodeExplanationSchema, type CodeExplanation, type ExplainRequest } from "@/shared/api";
import { AppError, describeError } from "@/server/security/errors";
import { buildUserMessage, explanationJsonSchema, MASTER_PROMPT } from "./master-prompt";

/** Explains a program line by line. */
export interface ExplanationProvider {
  /** Identifies the model and prompt, so cached explanations are never reused across a change. */
  readonly cacheKey: string;
  explain(input: ExplainRequest): Promise<CodeExplanation>;
}

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 45_000;
/** Bump when the master prompt or output format changes, to invalidate cached explanations. */
const PROMPT_VERSION = 2;

const CompletionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
});

const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

/**
 * Makes a model reply safe to use: trims and clips text to the schema limits, drops lines that
 * don't exist in the code, keeps one entry per line in order. The model is asked for all of this,
 * but the visualizer must never depend on a model getting it right.
 */
export function normalizeExplanation(raw: unknown, lineCount: number): CodeExplanation {
  const loose = z
    .object({
      summary: z.string(),
      keyInsights: z.array(z.object({ title: z.string(), detail: z.string() })),
      lines: z.array(z.object({ line: z.number(), explain: z.string(), brief: z.string() })),
      closing: z.string(),
    })
    .parse(raw);
  const seen = new Set<number>();
  const lines = loose.lines
    .filter((l) => Number.isInteger(l.line) && l.line >= 1 && l.line <= lineCount && l.explain.trim() && !seen.has(l.line) && seen.add(l.line))
    .sort((a, b) => a.line - b.line)
    .map((l) => ({
      line: l.line,
      explain: clip(l.explain.trim(), 400),
      brief: clip(l.brief.trim() || l.explain.trim(), 120),
    }));
  return CodeExplanationSchema.parse({
    summary: clip(loose.summary.trim(), 600),
    keyInsights: loose.keyInsights
      .filter((k) => k.title.trim() && k.detail.trim())
      .slice(0, 5)
      .map((k) => ({ title: clip(k.title.trim(), 80), detail: clip(k.detail.trim(), 300) })),
    lines,
    closing: clip(loose.closing.trim(), 300),
  });
}

/** Groq's OpenAI-compatible chat API with strict structured output. The key never leaves the server. */
export function createGroqProvider(options: { apiKey: string; model: string }): ExplanationProvider {
  const { apiKey, model } = options;
  return {
    cacheKey: `groq:${model}:v${PROMPT_VERSION}`,

    async explain(input) {
      let res: Response;
      try {
        res = await fetch(API_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            temperature: 0.4,
            reasoning_effort: "medium",
            messages: [
              { role: "system", content: MASTER_PROMPT },
              { role: "user", content: buildUserMessage(input) },
            ],
            response_format: {
              type: "json_schema",
              json_schema: { name: "code_explanation", strict: true, schema: explanationJsonSchema },
            },
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (err) {
        console.error("Groq request failed", describeError(err));
        throw new AppError("SERVICE_UNAVAILABLE", "The AI explainer didn't answer. Try again in a moment.", { cause: err });
      }
      if (res.status === 429) {
        throw new AppError("RATE_LIMITED", "The AI explainer is busy. Try again in a minute.", { retryAfterSeconds: 30 });
      }
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error(`Groq returned ${res.status}`, detail.slice(0, 400));
        throw new AppError("SERVICE_UNAVAILABLE", "AI explanations aren't available right now.");
      }
      try {
        const completion = CompletionSchema.parse(await res.json());
        const content = completion.choices[0]?.message.content ?? "";
        return normalizeExplanation(JSON.parse(content), input.code.split("\n").length);
      } catch (err) {
        console.error("Groq reply was not a valid explanation", describeError(err));
        throw new AppError("SERVICE_UNAVAILABLE", "The AI explanation came back garbled. Try again.");
      }
    },
  };
}
