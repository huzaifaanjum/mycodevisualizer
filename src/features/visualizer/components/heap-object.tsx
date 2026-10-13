import type { Heap, HeapObject } from "@/shared/trace";
import type { CollectionDiff } from "../lib/collection-diff";
import { CollectionBox } from "./collection-box";
import { KindTag } from "./kind-tag";
import { VariableNames } from "./variable-names";
import { cn } from "@/lib/utils";
import { ValueText } from "./value-text";

type DrawableObject = Exclude<HeapObject, { kind: "string" }>;

export function HeapObjectBox({
  id,
  object,
  heap,
  changed,
  names = [],
  collectionDiff,
}: {
  id: string;
  object: DrawableObject;
  heap: Heap;
  changed: Set<string>;
  /** Variables that refer to this object (aliases when there are several). */
  names?: string[];
  /** Changes since the previous step, for lists, sets and maps. */
  collectionDiff?: CollectionDiff | null;
}) {
  if (object.kind === "list" || object.kind === "set" || object.kind === "map") {
    return <CollectionBox id={id} object={object} heap={heap} diff={collectionDiff ?? null} names={names} />;
  }
  if (object.kind === "array") {
    const hidden = object.length - object.items.length;
    return (
      <figure data-heap-id={id} className="mcv-pop-in w-fit max-w-full">
        <figcaption className="text-muted-foreground mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px]">
          <KindTag kind="array" />
          <VariableNames names={names} />
          <span>
            {object.elementType}[{object.length}]
          </span>
        </figcaption>
        {object.length === 0 ? (
          <div className="bg-card text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
            empty
          </div>
        ) : (
          <div className="bg-card flex flex-wrap overflow-hidden rounded-md border shadow-xs">
            {object.items.map((item, i) => (
              <div key={i} className="flex min-w-10 flex-col items-center border-r last:border-r-0">
                <div className="bg-muted text-muted-foreground w-full px-1.5 text-center font-mono text-[10px]">
                  {i}
                </div>
                <div className="px-2 py-1.5 text-xs">
                  <ValueText
                    value={item}
                    heap={heap}
                    sourceId={`${id}:${i}`}
                    changed={changed.has(`${id}:${i}`)}
                  />
                </div>
              </div>
            ))}
            {hidden > 0 && (
              <div className="text-muted-foreground self-center px-2 text-xs">+{hidden} more</div>
            )}
          </div>
        )}
      </figure>
    );
  }
  return (
    <figure
      data-heap-id={id}
      className="mcv-pop-in bg-card w-fit min-w-36 overflow-hidden rounded-md border shadow-xs"
    >
      <figcaption className="bg-muted/40 flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-3 py-1.5 font-mono text-xs">
        <KindTag kind={object.opaque ? "libraryObject" : "object"} />
        <VariableNames names={names} />
        <span className="font-semibold">{object.className}</span>
      </figcaption>
      {object.opaque || object.fields.length === 0 ? (
        <p className={cn("text-muted-foreground px-3 py-1.5 text-[11px]")}>
          {object.opaque ? "Java library object" : "No fields"}
        </p>
      ) : (
        <table className="w-full text-xs">
          <tbody>
            {object.fields.map((f) => (
              <tr key={f.name} className="border-border/60 border-b last:border-0">
                <td className="py-1.5 pr-2 pl-3 font-mono">{f.name}</td>
                <td className="py-1.5 pr-3 text-right">
                  <ValueText
                    value={f.value}
                    heap={heap}
                    sourceId={`${id}:${f.name}`}
                    changed={changed.has(`${id}:${f.name}`)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
