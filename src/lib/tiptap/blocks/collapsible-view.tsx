"use client";

import { ChevronDown, ChevronRight, Trash } from "lucide-react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { cn } from "@/lib/utils";

export function CollapsibleView({
  node,
  updateAttributes,
  editor,
  getPos,
}: NodeViewProps) {
  const open = Boolean(node.attrs.open);
  const title = String(node.attrs.title ?? "Section");

  function deleteBlock() {
    const pos = getPos();
    if (typeof pos !== "number") return;
    editor
      .chain()
      .command(({ tr }) => {
        tr.delete(pos, pos + node.nodeSize);
        return true;
      })
      .focus()
      .run();
  }

  return (
    <NodeViewWrapper
      className="not-prose my-4 overflow-hidden rounded-lg border bg-card text-card-foreground"
      data-block="collapsible"
    >
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        contentEditable={false}
      >
        <button
          type="button"
          onClick={() => updateAttributes({ open: !open })}
          aria-label={open ? "Collapse" : "Expand"}
          aria-expanded={open}
          className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {open ? (
            <ChevronDown className="size-4" aria-hidden />
          ) : (
            <ChevronRight className="size-4" aria-hidden />
          )}
        </button>
        <input
          type="text"
          value={title}
          onChange={(e) => updateAttributes({ title: e.target.value })}
          placeholder="Section title"
          className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={deleteBlock}
          aria-label="Remove collapsible block"
          title="Remove collapsible block"
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
        >
          <Trash className="size-3.5" aria-hidden />
        </button>
      </div>
      <div className={cn("px-4 py-3", !open && "hidden")}>
        <NodeViewContent as="div" />
      </div>
    </NodeViewWrapper>
  );
}
