// Description marker convention for Google Calendar events.
// Server-safe (no imports from server-only modules) so the client can import
// the parser to render Register / Tags / Audience / Gender affordances on
// event rows.

import type { AudienceTag, GenderTag } from "@/lib/supabase/types";

const REGISTER_MARKER = /^Register:\s*(\S+)\s*$/im;
const TAGS_MARKER = /^Tags:\s*(.+)\s*$/im;
const AUDIENCE_MARKER = /^Audience:\s*(.+)\s*$/im;
const GENDER_MARKER = /^Gender:\s*(.+)\s*$/im;

const AUDIENCE_VALUES: AudienceTag[] = [
  "Kids",
  "Jr. Youth",
  "Youth",
  "Young Professionals",
  "Family",
];
const GENDER_VALUES: GenderTag[] = ["Girls", "Boys", "Both"];

export type ParsedDescription = {
  description: string;
  registration_url: string | null;
  tags: string[];
  audience: AudienceTag | null;
  gender: GenderTag | null;
};

export function encodeDescription(input: {
  description?: string;
  registration_url?: string;
  tags?: string[];
  audience?: AudienceTag | null;
  gender?: GenderTag | null;
}): string {
  const lines: string[] = [];
  const body = (input.description ?? "").trim();
  if (body) lines.push(body);

  const meta: string[] = [];
  if (input.audience) meta.push(`Audience: ${input.audience}`);
  if (input.gender) meta.push(`Gender: ${input.gender}`);
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

function matchAudience(raw: string): AudienceTag | null {
  const trimmed = raw.trim();
  return (AUDIENCE_VALUES as string[]).includes(trimmed)
    ? (trimmed as AudienceTag)
    : null;
}

function matchGender(raw: string): GenderTag | null {
  const trimmed = raw.trim();
  return (GENDER_VALUES as string[]).includes(trimmed)
    ? (trimmed as GenderTag)
    : null;
}

export function parseDescription(raw: string | null): ParsedDescription {
  if (!raw) {
    return {
      description: "",
      registration_url: null,
      tags: [],
      audience: null,
      gender: null,
    };
  }

  let registration_url: string | null = null;
  let tags: string[] = [];
  let audience: AudienceTag | null = null;
  let gender: GenderTag | null = null;

  const registerMatch = raw.match(REGISTER_MARKER);
  if (registerMatch) registration_url = registerMatch[1].trim();

  const tagsMatch = raw.match(TAGS_MARKER);
  if (tagsMatch) {
    tags = tagsMatch[1]
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  const audienceMatch = raw.match(AUDIENCE_MARKER);
  if (audienceMatch) audience = matchAudience(audienceMatch[1]);

  const genderMatch = raw.match(GENDER_MARKER);
  if (genderMatch) gender = matchGender(genderMatch[1]);

  const description = raw
    .replace(REGISTER_MARKER, "")
    .replace(TAGS_MARKER, "")
    .replace(AUDIENCE_MARKER, "")
    .replace(GENDER_MARKER, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { description, registration_url, tags, audience, gender };
}
