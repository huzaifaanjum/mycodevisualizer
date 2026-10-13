import Link from "next/link";
import { getSessionUser } from "@/server/auth";
import { getConfig } from "@/server/env";
import { SITE } from "@/shared/constants";
import { AppLogo } from "@/components/common/app-logo";
import { NavLink } from "@/components/common/nav-link";
import { SignInDialog, UserMenu } from "@/features/auth";
import { AppearancePicker } from "@/features/theme";

export async function SiteHeader() {
  const { features } = getConfig();
  const user = await getSessionUser();
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur">
      <div className="flex items-center gap-6">
        <Link href="/" className="group flex items-center gap-2.5" aria-label={`${SITE.name} home`}>
          <AppLogo className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
          <span aria-hidden className="font-mono text-[15px] font-bold tracking-tight">
            <span className="text-muted-foreground">My</span>
            <span className="text-foreground">Code</span>
            <span className="text-primary">Visualizer</span>
          </span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          <NavLink href="/examples">Examples</NavLink>
          <NavLink href="/about">About</NavLink>
        </nav>
      </div>
      <div className="flex items-center gap-1">
        <NavLink href="/examples" className="sm:hidden">
          Examples
        </NavLink>
        <AppearancePicker />
        {features.auth &&
          (user ? <UserMenu name={user.name} image={user.image} /> : <SignInDialog github={features.github} google={features.google} />)}
      </div>
    </header>
  );
}
