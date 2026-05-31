import { mergeAttributes, Node } from "@tiptap/core";

export const TabsBlock = Node.create({
  name: "tabs",
  group: "block",
  content: "tabPanel+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      activePanel: {
        default: 0,
        parseHTML: (el) => {
          const raw = el.getAttribute("data-active-panel");
          const n = raw ? parseInt(raw, 10) : 0;
          return Number.isFinite(n) ? n : 0;
        },
        renderHTML: (attrs) => ({
          "data-active-panel": String(attrs.activePanel ?? 0),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-block="tabs"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-block": "tabs",
        class:
          "not-prose my-4 overflow-hidden rounded-lg border bg-card text-card-foreground",
      }),
      0,
    ];
  },
});

export const TabPanelBlock = Node.create({
  name: "tabPanel",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      title: {
        default: "Tab",
        parseHTML: (el) => el.getAttribute("data-title") ?? "Tab",
        renderHTML: (attrs) => ({ "data-title": String(attrs.title ?? "Tab") }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-block="tab-panel"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-block": "tab-panel",
        class: "px-4 py-3",
      }),
      0,
    ];
  },
});
