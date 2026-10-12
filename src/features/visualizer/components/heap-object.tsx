import type { Heap, HeapObject } from "@/shared/trace";
import { cn } from "@/lib/utils";
import { ValueText } from "./value-text";

type DrawableObject = Exclude<HeapObject, { kind: "string" }>;

export function HeapObjectBox({
  id,
  object,
  heap,
  changed,
}: {
  id: string;
  object: DrawableObject;
  heap: Heap;
  changed: Set<string>;
}) {
  if (object.kind === "array") {
    const hidden = object.length - object.items.length;
    return (
      <figure data-heap-id={id} className="mcv-frame-in w-fit max-w-full">
        <figcaption className="mb-1 font-mono text-[11px] text-muted-foreground">
          {object.elementType}[{object.length}]
        </figcaption>
        {object.length === 0 ? (
          <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">empty</div>
        ) : (
          <div className="flex flex-wrap overflow-hidden rounded-md border">
            {object.items.map((item, i) => (
              <div key={i} className="flex min-w-10 flex-col items-center border-r last:border-r-0">
                <div className="w-full bg-muted px-1.5 text-center font-mono text-[10px] text-muted-foreground">{i}</div>
                <div className="px-1.5 py-1 text-xs">
                  <ValueText value={item} heap={heap} sourceId={`${id}:${i}`} changed={changed.has(`${id}:${i}`)} />
                </div>
              </div>
            ))}
            {hidden > 0 && <div className="self-center px-2 text-xs text-muted-foreground">+{hidden} more</div>}
          </div>
        )}
      </figure>
    );
  }
  return (
    <figure data-heap-id={id} className="mcv-frame-in w-fit min-w-36 rounded-md border bg-card">
      <figcaption className="border-b px-3 py-1 font-mono text-xs font-semibold">{object.className}</figcaption>
      {object.opaque || object.fields.length === 0 ? (
        <p className={cn("px-3 py-1.5 text-[11px] text-muted-foreground")}>
          {object.opaque ? "Java library object" : "No fields"}
        </p>
      ) : (
        <table className="w-full text-xs">
          <tbody>
            {object.fields.map((f) => (
              <tr key={f.name} className="border-b border-border/60 last:border-0">
                <td className="py-1 pr-2 pl-3 font-mono">{f.name}</td>
                <td className="py-1 pr-3 text-right">
                  <ValueText value={f.value} heap={heap} sourceId={`${id}:${f.name}`} changed={changed.has(`${id}:${f.name}`)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
