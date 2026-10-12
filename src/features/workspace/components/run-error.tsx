import { BanIcon, CircleAlertIcon, HourglassIcon, ServerCrashIcon } from "lucide-react";
import type { ApiRequestError } from "@/shared/api/client";
import { Button } from "@/components/ui/button";

export function RunError({ error, onRetry }: { error: ApiRequestError; onRetry: () => void }) {
  const Icon =
    error.code === "RATE_LIMITED"
      ? HourglassIcon
      : error.code === "UNSUPPORTED_FEATURE"
        ? BanIcon
        : error.code === "EXECUTION_FAILED" || error.code === "SERVICE_UNAVAILABLE"
          ? ServerCrashIcon
          : CircleAlertIcon;
  const title =
    error.code === "RATE_LIMITED"
      ? "Slow down a little"
      : error.code === "UNSUPPORTED_FEATURE"
        ? "Not supported yet"
        : error.code === "VALIDATION_FAILED"
          ? "Check your code and input"
          : "Couldn't visualize this run";
  return (
    <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <Icon className="size-8 text-danger" aria-hidden />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
      {error.code !== "UNSUPPORTED_FEATURE" && error.code !== "VALIDATION_FAILED" && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
