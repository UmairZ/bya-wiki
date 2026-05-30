type Node = {
  type?: string;
  text?: string;
  content?: Node[];
};

/**
 * Walk a Tiptap document and concatenate every text leaf, inserting a single
 * space between blocks. Used to derive `excerpt` on save and to feed search.
 */
export function tiptapToPlainText(doc: unknown): string {
  const root = doc as Node | null | undefined;
  if (!root) return "";
  const parts: string[] = [];
  walk(root, parts);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function walk(node: Node, out: string[]) {
  if (typeof node.text === "string") {
    out.push(node.text);
    return;
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) walk(child, out);
    // Push a separator between block-level boundaries so adjacent paragraphs
    // don't run together when we collapse whitespace.
    if (isBlock(node.type)) out.push(" ");
  }
}

function isBlock(type?: string): boolean {
  if (!type) return false;
  return (
    type === "paragraph" ||
    type === "heading" ||
    type === "blockquote" ||
    type === "codeBlock" ||
    type === "bulletList" ||
    type === "orderedList" ||
    type === "taskList" ||
    type === "listItem" ||
    type === "taskItem"
  );
}

/** Truncate a string at a word boundary near `limit` chars. */
export function deriveExcerpt(input: string, limit = 180): string {
  const text = input.trim();
  if (text.length <= limit) return text;
  const truncated = text.slice(0, limit);
  const lastSpace = truncated.lastIndexOf(" ");
  const cut = lastSpace > Math.floor(limit * 0.6) ? lastSpace : limit;
  return truncated.slice(0, cut).trimEnd() + "…";
}
