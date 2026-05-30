import {
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  type LucideIcon,
} from "lucide-react";
import type { Editor, Range } from "@tiptap/core";

export type SlashCommand = {
  key: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  keywords?: string[];
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
];

export function filterCommands(query: string): SlashCommand[] {
  const q = query.toLowerCase().trim();
  if (!q) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((cmd) => {
    if (cmd.title.toLowerCase().includes(q)) return true;
    if (cmd.keywords?.some((k) => k.toLowerCase().includes(q))) return true;
    return false;
  });
}
