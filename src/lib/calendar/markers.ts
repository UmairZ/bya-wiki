// Description marker convention for Google Calendar events.
// Server-safe (no imports from server-only modules) so the client can import
// the parser to render Register / Tags affordances on event rows.

const REGISTER_MARKER = /^Register:\s*(\S+)\s*$/im;
const TAGS_MARKER = /^Tags:\s*(.+)\s*$/im;

export type ParsedDescription = {
  description: string;
  registration_url: string | null;
  tags: string[];
};

export function encodeDescription(input: {
  description?: string;
  registration_url?: string;
  tags?: string[];
}): string {
  const lines: string[] = [];
  const body = (input.description ?? "").trim();
  if (body) lines.push(body);

  const meta: string[] = [];
  if (input.registration_url?.trim()) {
    meta.push(`Register: ${input.registration_url.trim()}`);
  }
  if (input.tags && input.tags.length > 0) {
    const clean = input.tags
      .map((t) => t.trim())
      .filter(Boolean)
      .join(", ");
    if (clean) meta.push(`Tags: ${clean}`);
  }
  if (meta.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push(...meta);
  }
  return lines.join("\n");
}

export function parseDescription(raw: string | null): ParsedDescription {
  if (!raw) return { description: "", registration_url: null, tags: [] };

  let registration_url: string | null = null;
  let tags: string[] = [];

  const registerMatch = raw.match(REGISTER_MARKER);
  if (registerMatch) registration_url = registerMatch[1].trim();

  const tagsMatch = raw.match(TAGS_MARKER);
  if (tagsMatch) {
    tags = tagsMatch[1]
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  const description = raw
    .replace(REGISTER_MARKER, "")
    .replace(TAGS_MARKER, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { description, registration_url, tags };
}
