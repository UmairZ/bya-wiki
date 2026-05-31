// Small set of date helpers — no external library.

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

const DAY_FMT = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const TIME_FMT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const FULL_FMT = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

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
