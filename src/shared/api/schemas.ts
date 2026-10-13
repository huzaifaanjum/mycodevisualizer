import { z } from "zod";
import { ACCENT_IDS, LIMITS, SUPPORTED_LANGUAGES } from "@/shared/constants";

const byteLength = (s: string) => new TextEncoder().encode(s).length;

export const LanguageSchema = z.enum(SUPPORTED_LANGUAGES);

export const CodeSchema = z
  .string()
  .min(1, "Paste some code first.")
  .refine((s) => byteLength(s) <= LIMITS.maxCodeBytes, `Code must be at most ${LIMITS.maxCodeBytes / 1024} KB.`);

export const StdinSchema = z
  .string()
  .refine((s) => byteLength(s) <= LIMITS.maxStdinBytes, `Input must be at most ${LIMITS.maxStdinBytes / 1024} KB.`);

export const RunRequestSchema = z.strictObject({
  language: LanguageSchema,
  code: CodeSchema,
  stdin: StdinSchema.default(""),
});
export type RunRequest = z.infer<typeof RunRequestSchema>;

/** Public snippet ids are nanoid(10) over the URL-safe alphabet. */
export const PublicIdSchema = z.string().regex(/^[A-Za-z0-9_-]{10}$/, "Invalid snippet id.");

export const SnippetTitleSchema = z.string().trim().min(1).max(LIMITS.maxSnippetTitleLength);

export const CreateSnippetSchema = z.strictObject({
  language: LanguageSchema,
  code: CodeSchema,
  stdin: StdinSchema.default(""),
  title: SnippetTitleSchema.optional(),
});
export type CreateSnippetInput = z.infer<typeof CreateSnippetSchema>;

export const UpdateSnippetSchema = z.strictObject({ title: SnippetTitleSchema });
export type UpdateSnippetInput = z.infer<typeof UpdateSnippetSchema>;

export const PreferencesSchema = z.strictObject({ accent: z.enum(ACCENT_IDS) });
export type Preferences = z.infer<typeof PreferencesSchema>;

export const SnippetDtoSchema = z.object({
  publicId: PublicIdSchema,
  language: LanguageSchema,
  title: z.string(),
  code: z.string(),
  stdin: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isOwner: z.boolean(),
});
export type SnippetDto = z.infer<typeof SnippetDtoSchema>;

export const SnippetSummaryDtoSchema = SnippetDtoSchema.pick({
  publicId: true,
  language: true,
  title: true,
  createdAt: true,
  updatedAt: true,
});
export type SnippetSummaryDto = z.infer<typeof SnippetSummaryDtoSchema>;

/** Text to speak aloud. Kept short: one step note or one problem statement per request. */
export const NarrationRequestSchema = z.strictObject({
  text: z.string().trim().min(1, "Nothing to read aloud.").max(LIMITS.maxNarrationChars, "That text is too long to read aloud."),
});
export type NarrationRequest = z.infer<typeof NarrationRequestSchema>;
