"use client";

import { useMemo } from "react";
import type { Trace } from "@/shared/trace";
import { cn } from "@/lib/utils";
import { buildCallTree, type CallNode } from "../lib/trace-helpers";

/** Every method call so far as a tree: great for seeing recursion fan out and unwind. */
export function CallTree({ trace, index }: { trace: Trace; index: number }) {
  const tree = useMemo(() => buildCallTree(trace, index), [trace, index]);
  if (tree.roots.length === 0) {
    return <p className="p-4 text-xs text-muted-foreground">No calls yet.</p>;
  }
  return (
    <div className="h-full overflow-auto p-3">
      <ul role="tree" aria-label="Call tree" className="font-mono text-xs">
        {tree.roots.map((id) => (
          <TreeNode key={id} id={id} nodes={tree.nodes} />
        ))}
      </ul>
    </div>
  );
}

function TreeNode({ id, nodes }: { id: string; nodes: Map<string, CallNode> }) {
  const node = nodes.get(id);
  if (!node) return null;
  return (
    <li role="treeitem" aria-selected={node.status === "current"} className="relative">
      <div
        className={cn(
          "my-0.5 inline-flex items-center gap-2 rounded-md border px-2 py-1",
          node.status === "current" && "border-primary bg-primary/10 text-foreground",
          node.status === "active" && "border-border text-foreground",
          node.status === "returned" && "border-dashed text-returned",
        )}
      >
        <span>
          {node.method}({node.args})
        </span>
        {node.returnValue !== undefined && (
          <span className="text-primary">
            → <span className="text-foreground">{node.returnValue}</span>
          </span>
        )}
        {node.status === "current" && <span className="sr-only">(running now)</span>}
      </div>
      {node.children.length > 0 && (
        <ul role="group" className="ml-4 border-l border-border pl-3">
          {node.children.map((child) => (
            <TreeNode key={child} id={child} nodes={nodes} />
          ))}
        </ul>
      )}
    </li>
  );
}
