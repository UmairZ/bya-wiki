"use client";

import { AlertTriangle, CalendarDays, Clock, MapPin, Tag, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFullDateString, formatTime } from "@/lib/date-time";
import type { AudienceTag, GenderTag } from "@/lib/supabase/types";

export type MetadataValues = {
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  audience: AudienceTag | null;
  gender: GenderTag | null;
  free_tags: string[];
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return formatFullDateString(d);
}

function formatTimeRange(
  startsAt: string | null,
  endsAt: string | null,
  allDay: boolean,
): string | null {
  if (allDay) return "All day";
  if (!startsAt) return null;
  if (!endsAt) return formatTime(startsAt);
  return `${formatTime(startsAt)} – ${formatTime(endsAt)}`;
}

/** Compact, read-only metadata grid. Each row shows an icon, label, and value
 *  (or a placeholder when unset). When `required && !value`, the row is
 *  rendered with an amber warning treatment so it's obvious something needs
 *  filling in (used on draft view; on published events `required` is false). */
export function MetadataRow({
  Icon,
  label,
  value,
  placeholder,
  highlight,
  required,
  onClick,
}: {
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string | null;
  placeholder?: string;
  highlight?: boolean;
  required?: boolean;
  onClick?: () => void;
}) {
  const display = value ?? placeholder ?? "—";
  const isClickable = Boolean(onClick);
  const isMissing = !value;
  const isMissingRequired = required && isMissing;

  const inner = (
    <>
      {isMissingRequired ? (
        <AlertTriangle
          className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
      ) : (
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            isMissing ? "text-muted-foreground/40" : "text-muted-foreground",
          )}
          aria-hidden
        />
      )}
      <span
        className={cn(
          "shrink-0 text-[10px] font-semibold uppercase tracking-wider",
          isMissingRequired ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground",
        )}
      >
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </span>
      <span
        className={cn(
          "truncate text-sm",
          isMissingRequired
            ? "font-medium text-amber-700 dark:text-amber-400"
            : isMissing
              ? "text-muted-foreground/60 italic"
              : highlight
                ? "font-medium text-foreground"
                : "text-foreground/90",
        )}
      >
        {display}
      </span>
    </>
  );

  const wrapperCls = cn(
    "flex items-center gap-2 rounded-md px-2 py-1",
    isMissingRequired && "bg-amber-500/10 ring-1 ring-amber-500/40",
  );

  if (!isClickable) {
    return <div className={wrapperCls}>{inner}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        wrapperCls,
        "group w-full text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50",
        isMissingRequired && "hover:bg-amber-500/20",
      )}
    >
      {inner}
    </button>
  );
}

export function MetadataBadge({
  label,
  tone,
}: {
  label: string;
  tone: "audience" | "gender" | "tag";
}) {
  const toneCls =
    tone === "audience"
      ? "bg-brand-tint text-brand-tint-foreground"
      : tone === "gender"
        ? "bg-primary/10 text-primary"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        toneCls,
      )}
    >
      {label}
    </span>
  );
}

export function MetadataGrid({
  values,
  className,
}: {
  values: MetadataValues;
  className?: string;
}) {
  const dateStr = formatDate(values.starts_at);
  const timeStr = formatTimeRange(
    values.starts_at,
    values.ends_at,
    values.all_day,
  );

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="grid gap-1 md:grid-cols-2 lg:grid-cols-3">
        <MetadataRow Icon={CalendarDays} label="Date" value={dateStr} placeholder="Not set" />
        <MetadataRow Icon={Clock} label="Time" value={timeStr} placeholder="Not set" />
        <MetadataRow Icon={MapPin} label="Location" value={values.location} placeholder="Not set" />
      </div>
      {(values.audience ||
        values.gender ||
        values.free_tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 px-2 py-1">
          <Users className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          {values.audience && (
            <MetadataBadge label={values.audience} tone="audience" />
          )}
          {values.gender && (
            <MetadataBadge label={values.gender} tone="gender" />
          )}
          {values.free_tags.length > 0 && (
            <>
              <Tag className="ml-1 size-3 shrink-0 text-muted-foreground/60" aria-hidden />
              {values.free_tags.map((t) => (
                <MetadataBadge key={t} label={t} tone="tag" />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
