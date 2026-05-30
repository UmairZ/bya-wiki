const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

/**
 * Pretty relative timestamp: "2 hours ago", "yesterday", "in 3 minutes".
 * Pass an ISO string or Date.
 */
export function formatRelative(input: string | Date): string {
  const target = typeof input === "string" ? new Date(input) : input;
  let duration = (target.getTime() - Date.now()) / 1000;
  for (const { amount, unit } of DIVISIONS) {
    if (Math.abs(duration) < amount) {
      return RTF.format(Math.round(duration), unit);
    }
    duration /= amount;
  }
  return target.toISOString();
}
