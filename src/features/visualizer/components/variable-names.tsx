import { Link2Icon } from "lucide-react";
import { InfoTip } from "@/components/common/info-tip";
import { EXPLAIN } from "../lib/explanations";

/** Names of the variables that refer to a heap object; several names means they are aliases. */
export function VariableNames({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const text = <span className="text-primary text-xs font-semibold">{names.join(" = ")}</span>;
  if (names.length === 1) return text;
  return (
    <span className="inline-flex items-center gap-1">
      {text}
      <InfoTip title={EXPLAIN.aliases.title} text={EXPLAIN.aliases.text} hideIcon className="text-primary">
        <Link2Icon className="size-3.5" aria-label="shared by several variables" />
      </InfoTip>
    </span>
  );
}
