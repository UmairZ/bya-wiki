// Small set of date helpers — no external library.

// All event date display is anchored to this timezone so server-rendered
// (Node, UTC) and client-rendered (browser, user's TZ) views agree on what
// day a given timestamp falls in. Without this, an event set to Jul 4 7 PM
// Pacific would show as "Jul 5" on server-rendered cards (because the UTC
// equivalent crosses midnight) and "Jul 4" on client-rendered detail pages.
//
// If the org ever spans multiple timezones, move this into an app_settings
// row.
export const ORG_TIMEZONE = "America/Los_Angeles";

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

/** Map "YYYY-MM-DDTHH:mm" (datetime-local input) to a UTC ISO string. */
export function localInputToISO(value: string): string | null {
  if (!value) return null;
  // The Date constructor parses this as local time, then toISOString gives UTC.
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Map a UTC ISO string back to "YYYY-MM-DDTHH:mm" in local time. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "YYYY-MM-DD" → midnight local time of that day as a UTC ISO string. */
export function dateOnlyInputToISO(value: string): string | null {
  if (!value) return null;
  const [y, m, day] = value.split("-").map(Number);
  if (!y || !m || !day) return null;
  const d = new Date(y, m - 1, day, 0, 0, 0, 0);
  return d.toISOString();
}

/** UTC ISO → "YYYY-MM-DD" in local time. */
export function isoToDateOnlyInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** UTC ISO → "HH:mm" (24h) in local time, for an <input type="time">. */
export function isoToTimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Combine a "YYYY-MM-DD" date and "HH:mm" time (both local) into a UTC ISO
 *  string. All-day → local midnight; date with no time → 9am local default. */
export function combineDateTime(
  dateStr: string,
  timeStr: string,
  allDay: boolean,
): string | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  if (allDay) return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
  if (!timeStr) return new Date(y, m - 1, d, 9, 0, 0, 0).toISOString();
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh ?? 0, mm ?? 0, 0, 0).toISOString();
}

const DAY_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: ORG_TIMEZONE,
});

const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: ORG_TIMEZONE,
});

const FULL_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: ORG_TIMEZONE,
});

const MONTH_DAY_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: ORG_TIMEZONE,
});

const MONTH_LONG_FMT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: ORG_TIMEZONE,
});

const MONTH_SHORT_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: ORG_TIMEZONE,
});

const ISO_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: ORG_TIMEZONE,
});

/** "YYYY-MM-DD" of an ISO timestamp in the org timezone. Used to bucket
 *  events by day in calendar grids etc. */
export function isoDateInOrgTz(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  // en-CA produces "YYYY-MM-DD" — convenient.
  return ISO_DATE_FMT.format(d);
}

/** "Jul 4" — month + day in the org timezone. */
export function formatMonthDay(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return MONTH_DAY_FMT.format(d);
}

/** "Jul" — short month name in the org timezone. */
export function formatMonthShort(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return MONTH_SHORT_FMT.format(d);
}

/** Day-of-month number ("4") in the org timezone. */
export function dayOfMonthInOrgTz(input: string | Date): number {
  const d = typeof input === "string" ? new Date(input) : input;
  const parts = ISO_DATE_FMT.formatToParts(d);
  return Number(parts.find((p) => p.type === "day")!.value);
}

/** "July 2026" — long month + year in the org timezone. */
export function formatMonthLong(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return MONTH_LONG_FMT.format(d);
}

/** Format just the time portion of an ISO timestamp in the org timezone. */
export function formatTime(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return TIME_FMT.format(d);
}

/** Format a long-form date "Sat, Jul 4, 2026" in the org timezone. */
export function formatFullDateString(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return FULL_FMT.format(d);
}

export function formatEventWhen(event: {
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
}): string {
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : null;

  if (event.all_day) {
    if (!end || isSameDay(start, end)) return DAY_FMT.format(start);
    return `${DAY_FMT.format(start)} – ${DAY_FMT.format(end)}`;
  }

  const day = DAY_FMT.format(start);
  const startTime = TIME_FMT.format(start);
  if (!end) return `${day} · ${startTime}`;
  if (isSameDay(start, end)) {
    return `${day} · ${startTime} – ${TIME_FMT.format(end)}`;
  }
  return `${day} ${startTime} – ${DAY_FMT.format(end)} ${TIME_FMT.format(end)}`;
}

export function formatFullDate(d: Date): string {
  return FULL_FMT.format(d);
}

export function formatDay(d: Date): string {
  return DAY_FMT.format(d);
}

export function formatMonth(d: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(d);
}
