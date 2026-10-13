"use client";

import {
  AtomIcon,
  BookOpenIcon,
  CloudMoonIcon,
  CoffeeIcon,
  GhostIcon,
  LeafIcon,
  MoonIcon,
  MoonStarIcon,
  SnowflakeIcon,
  SunIcon,
  SunMediumIcon,
  SunriseIcon,
  SunsetIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ACCENTS, THEMES, type ThemeId } from "@/shared/constants";
import { isAccentId } from "../lib/accent";
import { isThemeId } from "../lib/theme";
import { useAccent } from "./accent-provider";
import { useTheme } from "./theme-provider";

const ICONS: Record<ThemeId, typeof SunIcon> = {
  light: SunIcon,
  white: SunMediumIcon,
  sepia: BookOpenIcon,
  "solarized-light": SunriseIcon,
  dim: MoonIcon,
  midnight: CloudMoonIcon,
  mocha: CoffeeIcon,
  nord: SnowflakeIcon,
  dracula: GhostIcon,
  "one-dark": AtomIcon,
  gruvbox: LeafIcon,
  "solarized-dark": SunsetIcon,
  black: MoonStarIcon,
};

const THEME_GROUPS = [
  { label: "Light themes", themes: THEMES.filter((t) => !t.dark) },
  { label: "Dark themes", themes: THEMES.filter((t) => t.dark) },
];

/** One menu for the color theme and the accent color. */
export function AppearancePicker() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  const currentTheme = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  const currentAccent = ACCENTS.find((a) => a.id === accent) ?? ACCENTS[0];
  const Icon = ICONS[currentTheme.id];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Appearance: ${currentTheme.label} theme, ${currentAccent.label} accent color`}
        >
          <Icon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex max-h-[min(36rem,80vh)] gap-1 overflow-y-auto">
        <div className="min-w-44">
          {THEME_GROUPS.map((g, i) => (
            <div key={g.label}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel>{g.label}</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={theme} onValueChange={(v) => isThemeId(v) && setTheme(v)}>
                {g.themes.map((t) => {
                  const ItemIcon = ICONS[t.id];
                  return (
                    <DropdownMenuRadioItem key={t.id} value={t.id}>
                      <ItemIcon />
                      {t.label}
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            </div>
          ))}
        </div>
        <div className="border-border min-w-40 border-l pl-1">
          <DropdownMenuLabel>Accent color</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={accent} onValueChange={(v) => isAccentId(v) && setAccent(v)}>
            {ACCENTS.map((a) => (
              <DropdownMenuRadioItem key={a.id} value={a.id}>
                <span
                  className="ring-foreground/20 size-3 rounded-full ring-1"
                  style={{ background: a.hex }}
                />
                {a.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
