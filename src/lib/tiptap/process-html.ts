import { slugify, uniqueSlug } from "@/lib/slug";

export type TocEntry = { id: string; level: 1 | 2 | 3; text: string };

const HEADING_RE = /<h([1-3])(\s[^>]*)?>([\s\S]*?)<\/h\1>/g;
const TAG_RE = /<[^>]+>/g;
const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(input: string): string {
  return input.replace(/&(#?\w+);/g, (_, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      const n = parseInt(code.slice(2), 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : `&${code};`;
    }
    if (code.startsWith("#")) {
      const n = parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : `&${code};`;
    }
    return ENTITY_MAP[code.toLowerCase()] ?? `&${code};`;
  });
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(TAG_RE, "")).replace(/\s+/g, " ").trim();
}

/**
 * Walk the Tiptap-rendered HTML and:
 *   - Assign a stable, unique `id` to every h1/h2/h3 (slug of the text;
 *     duplicates get -2/-3 suffixes).
 *   - Collect a flat TOC array for the on-this-page nav.
 *
 * If a heading already has an `id` attribute we leave it; that way an
 * author who manually edited the JSON still controls the anchor.
 */
export function processPageHTML(html: string): {
  html: string;
  toc: TocEntry[];
} {
  if (!html) return { html: "", toc: [] };

  const toc: TocEntry[] = [];
  const usedIds = new Set<string>();

  const enhanced = html.replace(
    HEADING_RE,
    (match, levelStr: string, attrs: string = "", inner: string) => {
      const level = Number(levelStr) as 1 | 2 | 3;
      const text = stripTags(inner);
      if (!text) return match;

      // Preserve any pre-existing id.
      const idMatch = (attrs ?? "").match(/\sid\s*=\s*["']([^"']+)["']/i);
      let id: string;
      if (idMatch && !usedIds.has(idMatch[1])) {
        id = idMatch[1];
        usedIds.add(id);
      } else {
        id = uniqueSlug(slugify(text), usedIds);
        usedIds.add(id);
      }

      toc.push({ id, level, text });

      const attrsWithoutId = (attrs ?? "").replace(
        /\sid\s*=\s*["'][^"']*["']/i,
        "",
      );
      return `<h${level}${attrsWithoutId} id="${id}">${inner}</h${level}>`;
    },
  );

  return { html: enhanced, toc };
}
