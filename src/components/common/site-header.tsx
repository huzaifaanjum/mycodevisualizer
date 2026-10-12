import Link from "next/link";
import { getSessionUser } from "@/server/auth";
import { getConfig } from "@/server/env";
import { SITE } from "@/shared/constants";
import { Button } from "@/components/ui/button";
import { SignInDialog, UserMenu } from "@/features/auth";
import { AccentPicker } from "@/features/theme";

export async function SiteHeader() {
  const { features } = getConfig();
  const user = await getSessionUser();
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight" aria-label={`${SITE.name} home`}>
          <span aria-hidden className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            {"{}"}
          </span>
          {SITE.name}
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/examples">Examples</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/about">About</Link>
          </Button>
        </nav>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" asChild className="sm:hidden">
          <Link href="/examples">Examples</Link>
        </Button>
        <AccentPicker />
        {features.auth &&
          (user ? <UserMenu name={user.name} image={user.image} /> : <SignInDialog github={features.github} google={features.google} />)}
      </div>
    </header>
  );
}
