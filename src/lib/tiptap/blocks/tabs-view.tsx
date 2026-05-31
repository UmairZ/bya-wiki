"use client";

import { Pencil, Plus, Trash, Trash2 } from "lucide-react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { cn } from "@/lib/utils";

export function TabsView({
  node,
  updateAttributes,
  editor,
  getPos,
}: NodeViewProps) {
  const titles: string[] = [];
  node.forEach((child) => {
    if (child.type.name === "tabPanel") {
      titles.push(String(child.attrs.title ?? "Tab"));
    }
  });

  const rawActive = Number(node.attrs.activePanel ?? 0);
  const active = Math.max(0, Math.min(rawActive, Math.max(0, titles.length - 1)));

  function activate(index: number) {
    updateAttributes({ activePanel: index });
  }

  function addPanel() {
    const pos = getPos();
    if (typeof pos !== "number") return;
    const insertAt = pos + node.nodeSize - 1;
    editor
      .chain()
      .insertContentAt(insertAt, {
        type: "tabPanel",
        attrs: { title: `Tab ${titles.length + 1}` },
        content: [{ type: "paragraph" }],
      })
      .focus()
      .run();
    updateAttributes({ activePanel: titles.length });
  }

  function renameActive() {
    const next = window.prompt("Rename tab", titles[active] ?? "Tab");
    if (next === null) return;
    const newTitle = next.trim() || "Tab";

    const basePos = getPos();
    if (typeof basePos !== "number") return;
    let pos = basePos + 1;
    let i = 0;
    node.forEach((child) => {
      if (child.type.name === "tabPanel" && i === active) {
        editor
          .chain()
          .command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, {
              ...child.attrs,
              title: newTitle,
            });
            return true;
          })
          .run();
      }
      i++;
      pos += child.nodeSize;
    });
  }

  function deleteActive() {
    if (titles.length <= 1) return;
    const basePos = getPos();
    if (typeof basePos !== "number") return;
    let pos = basePos + 1;
    let i = 0;
    node.forEach((child) => {
      if (child.type.name === "tabPanel" && i === active) {
        editor
          .chain()
          .command(({ tr }) => {
            tr.delete(pos, pos + child.nodeSize);
            return true;
          })
          .run();
      }
      i++;
      pos += child.nodeSize;
    });
    updateAttributes({ activePanel: Math.max(0, active - 1) });
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
    <NodeViewWrapper
      className="not-prose my-4 overflow-hidden rounded-lg border bg-card text-card-foreground"
      data-block="tabs"
      data-active-panel={String(active)}
    >
      <div
        className="flex items-center gap-1 overflow-x-auto border-b px-2 py-1.5"
        contentEditable={false}
      >
        {titles.map((title, i) => (
          <button
            key={i}
            type="button"
            onClick={() => activate(i)}
            aria-pressed={active === i}
            className={cn(
              "shrink-0 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors",
              active === i
                ? "bg-brand-tint text-brand-tint-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {title || "Tab"}
          </button>
        ))}
        <button
          type="button"
          onClick={addPanel}
          aria-label="Add tab"
          className="flex shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-4" aria-hidden />
        </button>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={renameActive}
            aria-label="Rename active tab"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" aria-hidden />
          </button>
          {titles.length > 1 && (
            <button
              type="button"
              onClick={deleteActive}
              aria-label="Delete active tab"
              title="Delete active tab"
              className="rounded-md p-1 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={deleteBlock}
            aria-label="Remove tabs block"
            title="Remove tabs block"
            className="rounded-md p-1 text-destructive hover:bg-destructive/10"
          >
            <Trash className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
      <NodeViewContent as="div" />
    </NodeViewWrapper>
  );
}
