import "server-only";

import { OAuth2Client } from "google-auth-library";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { encodeDescription } from "./markers";

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh if <5min remaining
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

// ---------------------------------------------------------------------------
// Env + client
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. See .env.local.example for the Google OAuth setup.`,
    );
  }
  return value;
}

export function getGoogleOAuthClient(redirectUri: string): OAuth2Client {
  return new OAuth2Client({
    clientId: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
    redirectUri,
  });
}

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

// ---------------------------------------------------------------------------
// Token storage (server-only via service-role admin client)
// ---------------------------------------------------------------------------

type ConnectionRow = {
  id: 1;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
  connected_email: string | null;
  calendar_id: string | null;
  calendar_name: string | null;
  connected_by: string | null;
};

export type ConnectionStatus =
  | { connected: false }
  | {
      connected: true;
      connectedEmail: string | null;
      calendarId: string | null;
      calendarName: string | null;
    };

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("google_oauth_connection")
    .select("connected_email, calendar_id, calendar_name")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return { connected: false };
  return {
    connected: true,
    connectedEmail: (data as ConnectionRow).connected_email,
    calendarId: (data as ConnectionRow).calendar_id,
    calendarName: (data as ConnectionRow).calendar_name,
  };
}

async function loadConnection(): Promise<ConnectionRow | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("google_oauth_connection")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return (data as ConnectionRow | null) ?? null;
}

export async function saveConnection(input: {
  refreshToken: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  connectedEmail: string | null;
  connectedBy: string | null;
}) {
  const admin = createSupabaseAdminClient();
  // Upsert the singleton.
  const { error } = await admin.from("google_oauth_connection").upsert(
    {
      id: 1,
      refresh_token: input.refreshToken,
      access_token: input.accessToken,
      access_token_expires_at: input.accessTokenExpiresAt,
      connected_email: input.connectedEmail,
      connected_by: input.connectedBy,
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`Failed to save connection: ${error.message}`);
}

export async function setSelectedCalendar(
  calendarId: string,
  calendarName: string,
) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("google_oauth_connection")
    .update({ calendar_id: calendarId, calendar_name: calendarName })
    .eq("id", 1);
  if (error) throw new Error(`Failed to save calendar: ${error.message}`);
}

export async function clearConnection() {
  const admin = createSupabaseAdminClient();
  await admin.from("google_oauth_connection").delete().eq("id", 1);
}

// ---------------------------------------------------------------------------
// Access-token refresh
// ---------------------------------------------------------------------------

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: string;
}> {
  const body = new URLSearchParams({
    client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Google token refresh failed (${response.status}): ${text}`,
    );
  }
  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  const expiresAt = new Date(
    Date.now() + data.expires_in * 1000,
  ).toISOString();
  return { accessToken: data.access_token, expiresAt };
}

async function getValidAccessToken(): Promise<string> {
  const connection = await loadConnection();
  if (!connection) {
    throw new Error("Google Calendar is not connected.");
  }

  const expiresAt = connection.access_token_expires_at
    ? new Date(connection.access_token_expires_at).getTime()
    : 0;
  const needsRefresh =
    !connection.access_token ||
    !expiresAt ||
    expiresAt - Date.now() < TOKEN_REFRESH_BUFFER_MS;

  if (!needsRefresh && connection.access_token) {
    return connection.access_token;
  }

  const { accessToken, expiresAt: newExpiry } = await refreshAccessToken(
    connection.refresh_token,
  );

  const admin = createSupabaseAdminClient();
  await admin
    .from("google_oauth_connection")
    .update({
      access_token: accessToken,
      access_token_expires_at: newExpiry,
    })
    .eq("id", 1);

  return accessToken;
}

async function callCalendarApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const accessToken = await getValidAccessToken();
  const response = await fetch(`${CALENDAR_API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Calendar API ${response.status}: ${text}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type GoogleCalendarListItem = {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string;
};

export async function listCalendars(): Promise<GoogleCalendarListItem[]> {
  const data = await callCalendarApi<{
    items?: Array<{
      id: string;
      summary: string;
      primary?: boolean;
      accessRole: string;
    }>;
  }>("/users/me/calendarList?showHidden=false&minAccessRole=writer");
  return (data.items ?? []).map((c) => ({
    id: c.id,
    summary: c.summary,
    primary: Boolean(c.primary),
    accessRole: c.accessRole,
  }));
}

export type EventPayload = {
  title: string;
  description?: string;
  location?: string;
  registration_url?: string;
  tags?: string[];
  starts_at: string; // ISO
  ends_at: string | null;
  all_day: boolean;
};

export async function createEvent(
  calendarId: string,
  payload: EventPayload,
): Promise<{ id: string; htmlLink: string }> {
  const body = buildGoogleEventBody(payload);
  const data = await callCalendarApi<{ id: string; htmlLink: string }>(
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: "POST", body: JSON.stringify(body) },
  );
  return { id: data.id, htmlLink: data.htmlLink };
}

export async function updateEvent(
  calendarId: string,
  eventId: string,
  payload: EventPayload,
): Promise<void> {
  const body = buildGoogleEventBody(payload);
  await callCalendarApi(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
}

export async function deleteEvent(
  calendarId: string,
  eventId: string,
): Promise<void> {
  await callCalendarApi(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
}

// Re-export the marker helpers for server-side consumers that already pull
// in this module. The canonical definitions live in ./markers (server-safe)
// so client components can import them too.
export {
  encodeDescription,
  parseDescription,
  type ParsedDescription,
} from "./markers";

// ---------------------------------------------------------------------------
// Internal: shape a request body for the Calendar API.
// ---------------------------------------------------------------------------

function buildGoogleEventBody(payload: EventPayload) {
  const description = encodeDescription({
    description: payload.description,
    registration_url: payload.registration_url,
    tags: payload.tags,
  });

  const body: Record<string, unknown> = {
    summary: payload.title,
    description: description || undefined,
    location: payload.location || undefined,
  };

  if (payload.all_day) {
    body.start = { date: ymd(payload.starts_at) };
    const endDate = payload.ends_at
      ? ymd(payload.ends_at)
      : ymd(payload.starts_at);
    // Google all-day end is exclusive — same-day events end on the next day.
    body.end = { date: addOneDay(endDate) };
  } else {
    body.start = { dateTime: payload.starts_at };
    body.end = {
      dateTime: payload.ends_at ?? payload.starts_at,
    };
  }

  return body;
}

function ymd(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addOneDay(ymdStr: string): string {
  const [y, m, d] = ymdStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
