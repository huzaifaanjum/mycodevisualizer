import {
  BoxIcon,
  BracesIcon,
  BracketsIcon,
  KeyRoundIcon,
  LibraryIcon,
  ListOrderedIcon,
  type LucideIcon,
} from "lucide-react";
import { InfoTip } from "@/components/common/info-tip";
import { EXPLAIN, type Explanation } from "../lib/explanations";

export type HeapKind = "array" | "object" | "libraryObject" | "list" | "set" | "map";

const KINDS: Record<HeapKind, { icon: LucideIcon; label: string; info: Explanation }> = {
  array: { icon: BracketsIcon, label: "array", info: EXPLAIN.array },
  object: { icon: BoxIcon, label: "object", info: EXPLAIN.object },
  libraryObject: { icon: LibraryIcon, label: "library", info: EXPLAIN.libraryObject },
  list: { icon: ListOrderedIcon, label: "list", info: EXPLAIN.list },
  set: { icon: BracesIcon, label: "set", info: EXPLAIN.set },
  map: { icon: KeyRoundIcon, label: "map", info: EXPLAIN.map },
};

/** A small "[ ] array" style tag: what kind of thing a heap box is, with a plain-language tooltip. */
export function KindTag({ kind }: { kind: HeapKind }) {
  const { icon: Icon, label, info } = KINDS[kind];
  return (
    <InfoTip
      title={info.title}
      text={info.text}
      hideIcon
      className="bg-card gap-1 rounded-full border px-1.5 py-px font-sans text-[10px] font-medium"
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </InfoTip>
  );
}
