import { InfoIcon, LinkIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Workspace } from "@/features/workspace";
import { getConfig } from "@/server/env";
import { getSnippetService } from "@/server/context";
import { getSessionUser } from "@/server/auth";
import { userIdentity } from "@/server/services/identity";
import { AppError } from "@/server/security/errors";
import { PublicIdSchema, type SnippetDto } from "@/shared/api";
import { BackButton } from "@/components/common/back-button";

export const metadata: Metadata = { title: "Shared program", robots: { index: false } };

async function loadSnippet(raw: string): Promise<SnippetDto | null> {
  const parsed = PublicIdSchema.safeParse(raw);
  if (!parsed.success || !getConfig().features.database) return null;
  const user = await getSessionUser();
  try {
    return await getSnippetService().get(parsed.data, user ? userIdentity(user.id) : null);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") return null;
    throw err;
  }
}

export default async function SharedSnippetPage({ params }: PageProps<"/s/[publicId]">) {
  const snippet = await loadSnippet((await params).publicId);
  if (!snippet) notFound();
  return (
    <Workspace
      language={snippet.language}
      initialCode={snippet.code}
      initialStdin={snippet.stdin}
      title={snippet.title}
      canShare
      autoRun
      canNarrate={getConfig().features.narration}
      banner={
        <div className="flex items-center gap-1.5 border-b bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <BackButton className="mr-1 h-6 px-2 text-xs" />
          <LinkIcon className="size-3.5 text-primary" aria-hidden />
          Shared program
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="About shared programs" className="rounded-full p-0.5 hover:text-foreground">
                <InfoIcon className="size-3.5" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              Press <strong>Edit code</strong> to change it. Your changes stay with you until you share again.
            </TooltipContent>
          </Tooltip>
        </div>
      }
    />
  );
}
