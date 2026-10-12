import { z } from "zod";

/**
 * Language-agnostic execution trace (schema version 1).
 * Produced by a language tracer (see /tracer for Java) and consumed by the visualizer.
 * Frames are ordered outermost first: frames[0] is main, the last frame is the current one.
 */

export const PrimitiveValueSchema = z.object({
  kind: z.literal("primitive"),
  type: z.string(),
  display: z.string(),
});
export const NullValueSchema = z.object({ kind: z.literal("null") });
export const RefValueSchema = z.object({ kind: z.literal("ref"), heapId: z.string() });
export const ValueSchema = z.discriminatedUnion("kind", [PrimitiveValueSchema, NullValueSchema, RefValueSchema]);

export const VariableSchema = z.object({
  name: z.string(),
  type: z.string(),
  value: ValueSchema,
});

export const HeapObjectSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("array"),
    elementType: z.string(),
    length: z.number().int().nonnegative(),
    items: z.array(ValueSchema),
  }),
  z.object({ kind: z.literal("string"), value: z.string() }),
  z.object({
    kind: z.literal("object"),
    className: z.string(),
    fields: z.array(VariableSchema),
    opaque: z.boolean().optional(),
  }),
]);

export const FrameSchema = z.object({
  id: z.string(),
  method: z.string(),
  className: z.string(),
  line: z.number().int(),
  locals: z.array(VariableSchema),
});

export const StepEventSchema = z.enum(["call", "step", "return", "exception", "end"]);

export const StepSchema = z.object({
  index: z.number().int().nonnegative(),
  line: z.number().int().nonnegative(),
  event: StepEventSchema,
  frames: z.array(FrameSchema),
  heap: z.record(z.string(), HeapObjectSchema),
  stdoutLength: z.number().int().nonnegative(),
  stdinConsumed: z.number().int().nonnegative(),
  returned: z.object({ method: z.string(), value: ValueSchema }).optional(),
  exception: z.object({ type: z.string(), message: z.string(), line: z.number().int() }).optional(),
});

export const DiagnosticSchema = z.object({
  line: z.number().int().positive(),
  column: z.number().int().positive(),
  message: z.string(),
});

export const TraceStatusSchema = z.enum(["ok", "compile_error", "runtime_error", "truncated", "internal_error"]);
export const TruncatedReasonSchema = z.enum(["STEP_LIMIT", "TIME_LIMIT", "OUTPUT_LIMIT"]);

export const TraceSchema = z.object({
  version: z.literal(1),
  language: z.string(),
  status: TraceStatusSchema,
  mainClass: z.string().optional(),
  truncatedReason: TruncatedReasonSchema.optional(),
  message: z.string().optional(),
  diagnostics: z.array(DiagnosticSchema).optional(),
  steps: z.array(StepSchema),
  stdout: z.string(),
});

export type PrimitiveValue = z.infer<typeof PrimitiveValueSchema>;
export type Value = z.infer<typeof ValueSchema>;
export type Variable = z.infer<typeof VariableSchema>;
export type HeapObject = z.infer<typeof HeapObjectSchema>;
export type Frame = z.infer<typeof FrameSchema>;
export type StepEvent = z.infer<typeof StepEventSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Diagnostic = z.infer<typeof DiagnosticSchema>;
export type TraceStatus = z.infer<typeof TraceStatusSchema>;
export type TruncatedReason = z.infer<typeof TruncatedReasonSchema>;
export type Trace = z.infer<typeof TraceSchema>;
export type Heap = Step["heap"];
