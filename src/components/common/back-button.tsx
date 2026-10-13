"use client";

import { ArrowLeftIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Routes seen in this tab. Client-side navigations don't update `document.referrer`, so we count them. */
let visitedRoutes = 0;

/** Mount once in the root layout so BackButton knows whether history stays inside the site. */
export function NavigationTracker() {
  const pathname = usePathname();
  useEffect(() => {
    visitedRoutes++;
  }, [pathname]);
  return null;
}

function cameFromSite(): boolean {
  if (visitedRoutes > 1) return true;
  if (!document.referrer) return false;
  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Goes back in history when the visitor arrived from within the site; otherwise (direct link,
 * new tab) it navigates to `fallbackHref` so the button never leaves the site.
 */
export function BackButton({
  fallbackHref = "/",
  label = "Back",
  className,
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => (cameFromSite() ? router.back() : router.push(fallbackHref))}
      className={cn("text-muted-foreground hover:text-foreground -ml-2", className)}
    >
      <ArrowLeftIcon aria-hidden />
      {label}
    </Button>
  );
}
