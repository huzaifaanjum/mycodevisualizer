"use client";

import { MoonIcon, MoonStarIcon, SunIcon } from "lucide-react";
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

const ICONS: Record<ThemeId, typeof SunIcon> = { light: SunIcon, dim: MoonIcon, black: MoonStarIcon };

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
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => isThemeId(v) && setTheme(v)}>
          {THEMES.map((t) => {
            const ItemIcon = ICONS[t.id];
            return (
              <DropdownMenuRadioItem key={t.id} value={t.id}>
                <ItemIcon />
                {t.label}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Accent color</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={accent} onValueChange={(v) => isAccentId(v) && setAccent(v)}>
          {ACCENTS.map((a) => (
            <DropdownMenuRadioItem key={a.id} value={a.id}>
              <span className="size-3 rounded-full ring-1 ring-foreground/20" style={{ background: a.hex }} />
              {a.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
