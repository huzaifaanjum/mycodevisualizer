"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** True when `pathname` is `href` or a page nested under it. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** A header nav item that marks the current route with `aria-current` and an accent underline. */
export function NavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const active = isActivePath(usePathname(), href);
  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      className={cn(
        "relative",
        active &&
          "bg-accent text-primary after:bg-primary after:absolute after:inset-x-3 after:-bottom-[11px] after:h-0.5 after:rounded-full",
        className,
      )}
    >
      <Link href={href} aria-current={active ? "page" : undefined}>
        {children}
      </Link>
    </Button>
  );
}
