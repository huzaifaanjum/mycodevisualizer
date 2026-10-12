"use client";

import { ExternalLinkIcon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiRequestError } from "@/shared/api/client";
import type { SnippetSummaryDto } from "@/shared/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { snippetsApi } from "../lib/api";

type Pending = { kind: "rename" | "delete"; snippet: SnippetSummaryDto } | null;

export function MySnippetsList() {
  const [snippets, setSnippets] = useState<SnippetSummaryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    snippetsApi
      .listMine()
      .then(setSnippets)
      .catch((e: unknown) => setError(e instanceof ApiRequestError ? e.message : "Couldn't load your snippets."));
  }, []);

  async function confirm() {
    if (!pending) return;
    try {
      if (pending.kind === "delete") {
        await snippetsApi.remove(pending.snippet.publicId);
        setSnippets((s) => s?.filter((x) => x.publicId !== pending.snippet.publicId) ?? null);
      } else {
        await snippetsApi.rename(pending.snippet.publicId, title.trim());
        setSnippets((s) => s?.map((x) => (x.publicId === pending.snippet.publicId ? { ...x, title: title.trim() } : x)) ?? null);
      }
      setPending(null);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "That didn't work. Please try again.");
    }
  }

  if (error) return <p role="alert" className="text-sm text-danger">{error}</p>;
  if (!snippets) return <Skeleton className="h-40" />;
  if (snippets.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No saved snippets yet. Press <strong className="text-foreground">Share</strong> in the editor to save one.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y rounded-xl border">
        {snippets.map((s) => (
          <li key={s.publicId} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString()}</p>
            </div>
            <Badge variant="outline">{s.language}</Badge>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon-sm" asChild aria-label={`Open ${s.title}`}>
                <Link href={`/s/${s.publicId}`}>
                  <ExternalLinkIcon />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Rename ${s.title}`}
                onClick={() => {
                  setTitle(s.title);
                  setPending({ kind: "rename", snippet: s });
                }}
              >
                <PencilIcon />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Delete ${s.title}`} onClick={() => setPending({ kind: "delete", snippet: s })}>
                <Trash2Icon />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending?.kind === "delete" ? "Delete snippet?" : "Rename snippet"}</DialogTitle>
            <DialogDescription>
              {pending?.kind === "delete"
                ? "The share link will stop working for everyone. This can't be undone."
                : "Give it a name you'll recognize later."}
            </DialogDescription>
          </DialogHeader>
          {pending?.kind === "rename" && (
            <Input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} aria-label="Snippet title" autoFocus />
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant={pending?.kind === "delete" ? "destructive" : "default"}
              onClick={() => void confirm()}
              disabled={pending?.kind === "rename" && title.trim() === ""}
            >
              {pending?.kind === "delete" ? "Delete" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
