import { LinkIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Workspace } from "@/features/workspace";
import { getConfig } from "@/server/env";
import { getSnippetService } from "@/server/context";
import { getSessionUser } from "@/server/auth";
import { userIdentity } from "@/server/services/identity";
import { AppError } from "@/server/security/errors";
import { PublicIdSchema, type SnippetDto } from "@/shared/api";

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
      banner={
        <div className="flex items-center gap-2 border-b bg-card/60 px-3 py-2 text-sm text-muted-foreground">
          <LinkIcon className="size-4 text-primary" aria-hidden />
          Shared program. Press <strong className="text-foreground">Edit code</strong> to change it; your changes stay with you until you share again.
        </div>
      }
    />
  );
}
