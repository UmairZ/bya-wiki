/** URL-encode a CalendarEvent.id into a /event/[id] href. Handles the `::`
 *  suffix we append for recurring-event instances. */
export function encodeEventHref(eventId: string): string {
  return `/event/${encodeURIComponent(eventId)}`;
}

/** Reverse of encodeEventHref — but Next.js already decodes path params, so
 *  this is here mainly for clarity / symmetry. */
export function decodeEventParam(param: string): string {
  // Next decodes once; double-encode protections aren't needed for our case.
  return param;
}
