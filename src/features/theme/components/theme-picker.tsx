"use client";

import { MoonIcon, MoonStarIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { THEMES, type ThemeId } from "@/shared/constants";
import { isThemeId } from "../lib/theme";
import { useTheme } from "./theme-provider";

const ICONS: Record<ThemeId, typeof SunIcon> = { light: SunIcon, dim: MoonIcon, black: MoonStarIcon };

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  const Icon = ICONS[current.id];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Theme: ${current.label}`}>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
