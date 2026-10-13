import type { Metadata } from "next";
import { AboutTour, type LanguageTab } from "@/features/about";
import { listLanguageAdapters } from "@/languages";
import { SITE } from "@/shared/constants";

export const metadata: Metadata = {
  title: "About",
  description: `What ${SITE.name} does, how it runs your code, and who made it.`,
};

export default function AboutPage() {
  const languages: LanguageTab[] = listLanguageAdapters().map((a) => ({
    id: a.id,
    name: a.displayName,
    ...a.guide,
  }));
  return <AboutTour languages={languages} />;
}
