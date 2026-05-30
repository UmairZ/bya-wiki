/**
 * Convert a human title into a URL-safe slug.
 * Lowercases, strips punctuation, collapses whitespace to single dashes,
 * caps at 60 chars on a word boundary.
 */
export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length === 0) return "untitled";
  if (base.length <= 60) return base;
  const truncated = base.slice(0, 60);
  const lastDash = truncated.lastIndexOf("-");
  return lastDash > 30 ? truncated.slice(0, lastDash) : truncated;
}

/**
 * Ensure a slug is unique among `existing` by appending -2, -3, … as needed.
 */
export function uniqueSlug(base: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
