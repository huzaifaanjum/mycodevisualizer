import { Skeleton } from "@/components/ui/skeleton";

export function RunningState() {
  return (
    <div role="status" aria-live="polite" className="flex h-full flex-col gap-3 p-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="size-2 animate-ping rounded-full bg-primary" aria-hidden />
        Compiling and tracing your program…
      </p>
      <Skeleton className="h-16" />
      <div className="grid flex-1 grid-cols-2 gap-6">
        <div className="space-y-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-16 opacity-60" />
        </div>
        <Skeleton className="h-12 w-3/4" />
      </div>
      <Skeleton className="h-24" />
    </div>
  );
}
