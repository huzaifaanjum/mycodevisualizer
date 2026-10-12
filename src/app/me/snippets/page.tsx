import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MySnippetsList } from "@/features/snippets";
import { getSessionUser } from "@/server/auth";

export const metadata: Metadata = { title: "My snippets", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MySnippetsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">My snippets</h1>
      <p className="mb-8 text-muted-foreground">Programs you&apos;ve shared. Anyone with a link can view it.</p>
      <MySnippetsList />
    </div>
  );
}
