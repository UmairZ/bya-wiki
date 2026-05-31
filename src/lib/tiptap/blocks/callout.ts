import { mergeAttributes, Node } from "@tiptap/core";

export const CALLOUT_VARIANTS = ["info", "warning", "tip", "note"] as const;
export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

export const CALLOUT_LABELS: Record<CalloutVariant, string> = {
  info: "Info",
  warning: "Warning",
  tip: "Tip",
  note: "Note",
};

// Class lookups that work for both server-rendered HTML and the NodeView.
// We keep colors as inline Tailwind utilities so Tailwind's content scan picks
// them up (don't construct class names dynamically with template literals).
export const CALLOUT_PANEL_CLASS: Record<CalloutVariant, string> = {
  info: "border-l-sky-500/70 bg-sky-50/60 dark:bg-sky-950/40",
  warning: "border-l-amber-500/70 bg-amber-50/60 dark:bg-amber-950/40",
  tip: "border-l-emerald-500/70 bg-emerald-50/60 dark:bg-emerald-950/40",
  note: "border-l-zinc-400/70 bg-zinc-50/80 dark:bg-zinc-900/60",
};

export const CALLOUT_LABEL_CLASS: Record<CalloutVariant, string> = {
  info: "text-sky-700 dark:text-sky-300",
  warning: "text-amber-700 dark:text-amber-300",
  tip: "text-emerald-700 dark:text-emerald-300",
  note: "text-zinc-700 dark:text-zinc-300",
};

function normalizeVariant(value: unknown): CalloutVariant {
  return (CALLOUT_VARIANTS as readonly string[]).includes(value as string)
    ? (value as CalloutVariant)
    : "info";
}

export const CalloutBlock = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info" as CalloutVariant,
        parseHTML: (el) => normalizeVariant(el.getAttribute("data-variant")),
        renderHTML: (attrs) => ({
          "data-variant": normalizeVariant(attrs.variant),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-block="callout"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const variant = normalizeVariant(node.attrs.variant);
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-block": "callout",
        class: `not-prose my-4 rounded-md border border-l-4 bg-card p-4 ${CALLOUT_PANEL_CLASS[variant]}`,
      }),
      [
        "div",
        {
          class: `mb-1 text-xs font-semibold uppercase tracking-wide ${CALLOUT_LABEL_CLASS[variant]}`,
        },
        CALLOUT_LABELS[variant],
      ],
      [
        "div",
        { class: "prose prose-sm dark:prose-invert max-w-none [&>p]:my-1" },
        0,
      ],
    ];
  },
});
