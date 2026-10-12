import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { SiteHeader } from "@/components/common/site-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccentProvider, ACCENT_INIT_SCRIPT } from "@/features/theme";
import { getSessionUser } from "@/server/auth";
import { usersRepository } from "@/server/repositories/users.repository";
import { DEFAULT_ACCENT, SITE, type AccentId } from "@/shared/constants";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: `${SITE.name}: see Java code run step by step`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { title: SITE.name, description: SITE.description, type: "website" },
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

async function accountAccent(): Promise<AccentId | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return usersRepository.getAccent(user.id).catch(() => null);
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const saved = await accountAccent();
  return (
    <html
      lang="en"
      data-accent={saved ?? DEFAULT_ACCENT}
      data-server-accent={saved ? "1" : undefined}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <Script id="mcv-accent" strategy="beforeInteractive">
          {ACCENT_INIT_SCRIPT}
        </Script>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-1 focus:text-primary-foreground">
          Skip to content
        </a>
        <AccentProvider initialAccent={saved ?? DEFAULT_ACCENT} persistToAccount={saved !== null}>
          <TooltipProvider delayDuration={300}>
            <SiteHeader />
            <main id="main">{children}</main>
          </TooltipProvider>
        </AccentProvider>
      </body>
    </html>
  );
}
