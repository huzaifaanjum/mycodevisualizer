"use client";

import { CheckIcon, CopyIcon, Share2Icon } from "lucide-react";
import { useState } from "react";
import { ApiRequestError } from "@/shared/api/client";
import type { LanguageId } from "@/shared/constants";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { snippetsApi } from "../lib/api";

type ShareState = { status: "idle" } | { status: "saving" } | { status: "saved"; url: string } | { status: "error"; message: string };

/** Saves code + input as a public-by-link snippet and shows the link to copy. */
export function ShareButton({ language, code, stdin }: { language: LanguageId; code: string; stdin: string }) {
  const [state, setState] = useState<ShareState>({ status: "idle" });
  const [copied, setCopied] = useState(false);

  async function share() {
    setState({ status: "saving" });
    setCopied(false);
    try {
      const { publicId } = await snippetsApi.create({ language, code, stdin });
      setState({ status: "saved", url: `${window.location.origin}/s/${publicId}` });
    } catch (err) {
      setState({ status: "error", message: err instanceof ApiRequestError ? err.message : "Couldn't save the snippet." });
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog onOpenChange={(open) => open && void share()}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={code.trim() === ""}>
          <Share2Icon /> Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this program</DialogTitle>
          <DialogDescription>Anyone with the link can view and visualize this code and input. It can&apos;t be edited by others.</DialogDescription>
        </DialogHeader>
        {state.status === "saving" && <p className="text-sm text-muted-foreground">Saving…</p>}
        {state.status === "error" && <p role="alert" className="text-sm text-danger">{state.message}</p>}
        {state.status === "saved" && (
          <div className="flex gap-2">
            <Input readOnly value={state.url} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} />
            <Button onClick={() => void copy(state.url)} aria-label="Copy link">
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
