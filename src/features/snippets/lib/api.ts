import { z } from "zod";
import { apiRequest } from "@/shared/api/client";
import { SnippetSummaryDtoSchema, type CreateSnippetInput, type SnippetSummaryDto } from "@/shared/api";

const CreatedSchema = z.object({ publicId: z.string() });
const OkSchema = z.object({ ok: z.literal(true) });

export const snippetsApi = {
  create: (input: CreateSnippetInput) => apiRequest("/api/snippets", { method: "POST", body: input, schema: CreatedSchema }),
  listMine: (): Promise<SnippetSummaryDto[]> => apiRequest("/api/me/snippets", { schema: z.array(SnippetSummaryDtoSchema) }),
  rename: (publicId: string, title: string) =>
    apiRequest(`/api/snippets/${encodeURIComponent(publicId)}`, { method: "PATCH", body: { title }, schema: OkSchema }),
  remove: (publicId: string) =>
    apiRequest(`/api/snippets/${encodeURIComponent(publicId)}`, { method: "DELETE", schema: OkSchema }),
};
