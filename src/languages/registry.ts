import type { LanguageId } from "@/shared/constants";
import { javaAdapter } from "./java/adapter";
import type { LanguageAdapter } from "./types";

const ADAPTERS: Record<LanguageId, LanguageAdapter> = {
  java: javaAdapter,
};

export function getLanguageAdapter(id: LanguageId): LanguageAdapter {
  return ADAPTERS[id];
}

export const DEFAULT_LANGUAGE: LanguageId = "java";
