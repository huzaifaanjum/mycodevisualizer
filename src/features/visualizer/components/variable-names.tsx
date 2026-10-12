/** Names of the variables that refer to a heap object; several names means they are aliases. */
export function VariableNames({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <span className="text-xs font-semibold text-primary" title={names.length > 1 ? "These variables all refer to this same object" : undefined}>
      {names.join(" = ")}
    </span>
  );
}
