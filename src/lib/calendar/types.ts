// Normalized calendar event shape used across the wiki UI. Decoupled from
// the ICS / Google specifics so we could swap to a different source later
// without touching consumers.

export type CalendarEvent = {
  /** Stable id we can use as a React key. For recurring events this is
   *  uid + occurrence ISO so each occurrence is unique. */
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  /** ISO timestamp. */
  starts_at: string;
  /** ISO timestamp; null if unknown. */
  ends_at: string | null;
  all_day: boolean;
  /** Direct link back to the event in Google Calendar, if known. */
  html_link: string | null;
};
