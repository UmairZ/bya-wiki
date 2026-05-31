import { mergeAttributes, Node } from "@tiptap/core";

export const CollapsibleBlock = Node.create({
  name: "collapsible",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      title: {
        default: "Section",
        parseHTML: (el) =>
          el.querySelector(":scope > summary")?.textContent?.trim() ??
          el.getAttribute("data-title") ??
          "Section",
        renderHTML: (attrs) => ({ "data-title": String(attrs.title ?? "Section") }),
      },
      open: {
        default: false,
        parseHTML: (el) => el.hasAttribute("open"),
        renderHTML: (attrs) => (attrs.open ? { open: "" } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'details[data-block="collapsible"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const containerAttrs = mergeAttributes(HTMLAttributes, {
      "data-block": "collapsible",
      class:
        "not-prose group my-4 overflow-hidden rounded-lg border bg-card text-card-foreground",
    });
    return [
      "details",
      containerAttrs,
      [
        "summary",
        {
          class:
            "flex cursor-pointer list-none items-center gap-2 border-b px-3 py-2 text-sm font-medium select-none [&::-webkit-details-marker]:hidden",
        },
        [
          "span",
          {
            class:
              "inline-flex size-5 items-center justify-center rounded transition-transform group-open:rotate-90",
          },
          "▸",
        ],
        String(node.attrs.title ?? "Section"),
      ],
      ["div", { class: "px-4 py-3" }, 0],
    ];
  },
});
