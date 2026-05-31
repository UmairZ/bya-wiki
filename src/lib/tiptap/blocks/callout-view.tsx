"use client";

import { Trash } from "lucide-react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import {
  CALLOUT_LABEL_CLASS,
  CALLOUT_LABELS,
  CALLOUT_PANEL_CLASS,
  CALLOUT_VARIANTS,
  type CalloutVariant,
} from "./callout";
import { cn } from "@/lib/utils";

function normalize(value: unknown): CalloutVariant {
  return (CALLOUT_VARIANTS as readonly string[]).includes(value as string)
    ? (value as CalloutVariant)
    : "info";
}

export function CalloutView({
  node,
  updateAttributes,
  editor,
  getPos,
}: NodeViewProps) {
  const variant = normalize(node.attrs.variant);

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
      className={cn(
        "not-prose my-4 rounded-md border border-l-4 bg-card p-4",
        CALLOUT_PANEL_CLASS[variant],
      )}
      data-block="callout"
    >
      <div
        className="mb-2 flex items-center justify-between gap-2"
        contentEditable={false}
      >
        <div className="flex items-center gap-1">
          {CALLOUT_VARIANTS.map((v) => {
            const active = v === variant;
            return (
              <button
                key={v}
                type="button"
                onClick={() => updateAttributes({ variant: v })}
                aria-pressed={active}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                  active
                    ? cn("bg-background", CALLOUT_LABEL_CLASS[v])
                    : "text-muted-foreground hover:bg-background/60",
                )}
              >
                {CALLOUT_LABELS[v]}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={deleteBlock}
          aria-label="Remove callout"
          title="Remove callout"
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
        >
          <Trash className="size-3.5" aria-hidden />
        </button>
      </div>
      <NodeViewContent
        as="div"
        className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1"
      />
    </NodeViewWrapper>
  );
}
