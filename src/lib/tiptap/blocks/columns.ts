import { mergeAttributes, Node } from "@tiptap/core";

// Viewport-based grid classes. sm: (640px) kicks in on any reasonable
// desktop. On phones in portrait, columns reflow to single column.
const COLUMNS_GRID_CLASS: Record<number, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 md:grid-cols-4",
};

export function columnsGridClass(count: number): string {
  const clamped = Math.min(4, Math.max(2, count));
  return COLUMNS_GRID_CLASS[clamped] ?? COLUMNS_GRID_CLASS[2];
}

export const ColumnsBlock = Node.create({
  name: "columns",
  group: "block",
  content: "column{2,4}",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-block="columns"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-block": "columns",
        class: `not-prose my-4 grid gap-4 ${columnsGridClass(node.childCount)}`,
      }),
      0,
    ];
  },
});

export const ColumnBlock = Node.create({
  name: "column",
  content: "block+",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-block="column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-block": "column",
        class: "min-w-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
      }),
      0,
    ];
  },
});
