import { ArrowLeftIcon, BookOpenIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

export function IdleState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">See your code run, one line at a time</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Paste Java code on the left, add any input your program reads, then press <strong className="text-foreground">Visualize</strong>.
          You&apos;ll see variables change, methods get called, and arrays live in memory.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        <ArrowLeftIcon className="size-3.5" aria-hidden />
        <span>
          Tip: press <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> to visualize
        </span>
      </div>
      <Button variant="outline" asChild>
        <Link href="/examples">
          <BookOpenIcon /> Browse examples
        </Link>
      </Button>
    </div>
  );
}
