"use client";

import { PaletteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ACCENTS } from "@/shared/constants";
import { isAccentId } from "../lib/accent";
import { useAccent } from "./accent-provider";

export function AccentPicker() {
  const { accent, setAccent } = useAccent();
  const current = ACCENTS.find((a) => a.id === accent) ?? ACCENTS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Accent color: ${current.label}`}>
          <PaletteIcon />
          <span className="size-3 rounded-full ring-1 ring-white/20" style={{ background: current.hex }} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Accent color</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={accent} onValueChange={(v) => isAccentId(v) && setAccent(v)}>
          {ACCENTS.map((a) => (
            <DropdownMenuRadioItem key={a.id} value={a.id}>
              <span className="size-3 rounded-full ring-1 ring-white/20" style={{ background: a.hex }} />
              {a.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
