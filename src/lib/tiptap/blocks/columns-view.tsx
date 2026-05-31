"use client";

import { Plus, Trash, Trash2 } from "lucide-react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { columnsGridClass } from "./columns";

export function ColumnsView({ node, editor, getPos }: NodeViewProps) {
  const count = node.childCount;

  function addColumn() {
    if (count >= 4) return;
    const pos = getPos();
    if (typeof pos !== "number") return;
    const insertAt = pos + node.nodeSize - 1;
    editor
      .chain()
      .insertContentAt(insertAt, {
        type: "column",
        content: [{ type: "paragraph" }],
      })
      .focus()
      .run();
  }

  function removeLastColumn() {
    if (count <= 2) return;
    const pos = getPos();
    if (typeof pos !== "number") return;
    let cursor = pos + 1;
    let lastStart = cursor;
    let lastSize = 0;
    node.forEach((child) => {
      lastStart = cursor;
      lastSize = child.nodeSize;
      cursor += child.nodeSize;
    });
    editor
      .chain()
      .command(({ tr }) => {
        tr.delete(lastStart, lastStart + lastSize);
        return true;
      })
      .run();
  }

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
    <NodeViewWrapper className="not-prose my-4" data-block="columns">
      <div
        className="mb-1.5 flex items-center justify-end gap-0.5"
        contentEditable={false}
      >
        <span className="mr-2 text-xs text-muted-foreground">
          {count} columns
        </span>
        <button
          type="button"
          onClick={addColumn}
          disabled={count >= 4}
          aria-label="Add column"
          title="Add column"
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Plus className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={removeLastColumn}
          disabled={count <= 2}
          aria-label="Remove last column"
          title="Remove last column"
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={deleteBlock}
          aria-label="Remove columns block"
          title="Remove columns block"
          className="flex size-6 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
        >
          <Trash className="size-3.5" aria-hidden />
        </button>
      </div>
      <NodeViewContent
        as="div"
        className={`grid gap-4 ${columnsGridClass(count)}`}
      />
    </NodeViewWrapper>
  );
}
