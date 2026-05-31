import {
  Code,
  Columns2,
  Heading1,
  Heading2,
  Heading3,
  Info,
  LayoutPanelTop,
  List,
  ListChecks,
  ListOrdered,
  ListTree,
  Minus,
  Pilcrow,
  Quote,
  Tally5,
  type LucideIcon,
} from "lucide-react";
import type { Editor, Range } from "@tiptap/core";

export type SlashCommand = {
  key: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  keywords?: string[];
  /** Return false to hide this command in the current context. */
  available?: (editor: Editor) => boolean;
  run: (editor: Editor, range: Range) => void;
};

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    key: "paragraph",
    title: "Text",
    description: "Plain paragraph",
    Icon: Pilcrow,
    keywords: ["paragraph", "p", "body"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    key: "heading-1",
    title: "Heading 1",
    description: "Large section heading",
    Icon: Heading1,
    keywords: ["h1", "title"],
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHeading({ level: 1 })
        .run(),
  },
  {
    key: "heading-2",
    title: "Heading 2",
    description: "Medium heading",
    Icon: Heading2,
    keywords: ["h2"],
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHeading({ level: 2 })
        .run(),
  },
  {
    key: "heading-3",
    title: "Heading 3",
    description: "Small heading",
    Icon: Heading3,
    keywords: ["h3"],
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHeading({ level: 3 })
        .run(),
  },
  {
    key: "bullet-list",
    title: "Bullet list",
    description: "Simple bulleted list",
    Icon: List,
    keywords: ["ul", "list", "bullets"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    key: "ordered-list",
    title: "Numbered list",
    description: "Numbered list",
    Icon: ListOrdered,
    keywords: ["ol", "numbered", "ordered"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    key: "task-list",
    title: "Checklist",
    description: "To-do list with checkboxes",
    Icon: ListChecks,
    keywords: ["todo", "checklist", "task", "checkbox"],
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleList("taskList", "taskItem")
        .run(),
  },
  {
    key: "blockquote",
    title: "Quote",
    description: "Pull-quote block",
    Icon: Quote,
    keywords: ["blockquote", "quote", "cite"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    key: "code-block",
    title: "Code block",
    description: "Monospaced code fence",
    Icon: Code,
    keywords: ["code", "monospace", "pre"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    key: "divider",
    title: "Divider",
    description: "Horizontal rule",
    Icon: Minus,
    keywords: ["hr", "divider", "line"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  // ------------------ Custom structured-layout blocks ------------------
  {
    key: "tabs",
    title: "Tabs",
    description: "Switchable panels on one page",
    Icon: LayoutPanelTop,
    keywords: ["tabs", "switch"],
    available: (editor) => !editor.isActive("tabs") && !editor.isActive("tabPanel"),
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "tabs",
          attrs: { activePanel: 0 },
          content: [
            {
              type: "tabPanel",
              attrs: { title: "Tab 1" },
              content: [{ type: "paragraph" }],
            },
            {
              type: "tabPanel",
              attrs: { title: "Tab 2" },
              content: [{ type: "paragraph" }],
            },
          ],
        })
        .run(),
  },
  {
    key: "collapsible",
    title: "Collapsible",
    description: "Section that opens on click",
    Icon: ListTree,
    keywords: ["toggle", "accordion", "expand", "collapsible"],
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "collapsible",
          attrs: { title: "Section", open: true },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    key: "callout",
    title: "Callout",
    description: "Info / warning / tip / note panel",
    Icon: Info,
    keywords: ["callout", "note", "warning", "tip", "info", "admonition"],
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "callout",
          attrs: { variant: "info" },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    key: "columns",
    title: "Columns",
    description: "Side-by-side layout that reflows on mobile",
    Icon: Columns2,
    keywords: ["columns", "grid", "side-by-side"],
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "columns",
          content: [
            { type: "column", content: [{ type: "paragraph" }] },
            { type: "column", content: [{ type: "paragraph" }] },
          ],
        })
        .run(),
  },
  {
    key: "steps",
    title: "Steps",
    description: "Numbered procedure",
    Icon: Tally5,
    keywords: ["steps", "stepper", "procedure", "sop"],
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "steps",
          content: [
            { type: "step", content: [{ type: "paragraph" }] },
            { type: "step", content: [{ type: "paragraph" }] },
            { type: "step", content: [{ type: "paragraph" }] },
          ],
        })
        .run(),
  },
];

export function filterCommands(query: string, editor: Editor): SlashCommand[] {
  const q = query.toLowerCase().trim();
  const usable = SLASH_COMMANDS.filter((cmd) =>
    cmd.available ? cmd.available(editor) : true,
  );
  if (!q) return usable;
  return usable.filter((cmd) => {
    if (cmd.title.toLowerCase().includes(q)) return true;
    if (cmd.keywords?.some((k) => k.toLowerCase().includes(q))) return true;
    return false;
  });
}
