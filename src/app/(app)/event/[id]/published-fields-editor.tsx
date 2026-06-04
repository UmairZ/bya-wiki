"use client";

import { useState, useTransition } from "react";
import {
  CalendarDays,
  Check,
  Clock,
  Link as LinkIcon,
  MapPin,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AUDIENCE_VALUES,
  GENDER_VALUES,
  type AudienceTag,
  type GenderTag,
} from "@/lib/supabase/types";
import {
  formatFullDateString,
  formatTime,
} from "@/lib/date-time";
import type { CalendarEvent } from "@/lib/calendar/types";
import type { ParsedDescription } from "@/lib/calendar/markers";
import { updateEventFieldAction } from "./actions";
import { MetadataBadge, MetadataRow } from "./metadata-block";
import { CopyField } from "./copy-field";

type Values = {
  event: CalendarEvent;
  parsed: ParsedDescription;
};

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoToTimeInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function combineDateTime(
  dateStr: string,
  timeStr: string,
  allDay: boolean,
): string | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  if (allDay) {
    return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
  }
  if (!timeStr) {
    return new Date(y, m - 1, d, 9, 0, 0, 0).toISOString();
  }
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh ?? 0, mm ?? 0, 0, 0).toISOString();
}

export function PublishedFieldsEditor({
  event,
  parsed,
}: {
  event: CalendarEvent;
  parsed: ParsedDescription;
}) {
  const values: Values = { event, parsed };
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1 rounded-lg border bg-card p-3 md:grid-cols-2 lg:grid-cols-3">
        <DateTimeEditor values={values} />
        <LocationEditor values={values} />
        <AudienceEditor values={values} />
        <GenderEditor values={values} />
        <RegistrationEditor values={values} />
        <TagsEditor values={values} />
      </div>
    </div>
  );
}

function useFieldSave(eventRef: string) {
  const [pending, startTransition] = useTransition();
  function save(
    patch: Parameters<typeof updateEventFieldAction>[1],
    onSuccess?: () => void,
  ) {
    startTransition(async () => {
      const r = await updateEventFieldAction(eventRef, patch);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      onSuccess?.();
    });
  }
  return { save, pending };
}

// ---------------------------------------------------------------------------

function DateTimeEditor({ values }: { values: Values }) {
  const { event } = values;
  const [open, setOpen] = useState(false);
  const { save, pending } = useFieldSave(event.id);
  const [date, setDate] = useState(isoToDateInput(event.starts_at));
  const [startTime, setStartTime] = useState(isoToTimeInput(event.starts_at));
  const [endTime, setEndTime] = useState(isoToTimeInput(event.ends_at));
  const [allDay, setAllDay] = useState(event.all_day);

  function commit() {
    if (!date) return;
    const startIso = combineDateTime(date, startTime, allDay);
    const endIso =
      endTime && !allDay ? combineDateTime(date, endTime, false) : null;
    if (!startIso) return;
    save(
      { starts_at: startIso, ends_at: endIso, all_day: allDay },
      () => setOpen(false),
    );
  }

  const dateLabel = formatFullDateString(event.starts_at);
  const timeLabel = event.all_day
    ? "All day"
    : event.ends_at
      ? `${formatTime(event.starts_at)} – ${formatTime(event.ends_at)}`
      : formatTime(event.starts_at);

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="block w-full rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50"
            >
              <MetadataRow
                Icon={CalendarDays}
                label="Date"
                value={dateLabel}
              />
            </button>
          }
        />
        <DropdownMenuContent align="start" className="w-72 p-3">
          <div
            className="flex flex-col gap-2"
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Label htmlFor={`pd-${event.id}`}>Date</Label>
            <Input
              id={`pd-${event.id}`}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              autoFocus
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="size-4 accent-[var(--brand)]"
              />
              All day
            </label>
            {!allDay && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor={`ps-${event.id}`}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    Start
                  </Label>
                  <Input
                    id={`ps-${event.id}`}
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor={`pe-${event.id}`}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    End
                  </Label>
                  <Input
                    id={`pe-${event.id}`}
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end pt-1">
              <Button size="sm" onClick={commit} disabled={pending}>
                Save
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <MetadataRow Icon={Clock} label="Time" value={timeLabel} />
    </>
  );
}

// ---------------------------------------------------------------------------

function LocationEditor({ values }: { values: Values }) {
  const { event } = values;
  const [open, setOpen] = useState(false);
  const { save, pending } = useFieldSave(event.id);
  const [value, setValue] = useState(event.location ?? "");

  function commit() {
    const trimmed = value.trim();
    save({ location: trimmed === "" ? null : trimmed }, () => setOpen(false));
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="block w-full rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50"
          >
            <MetadataRow
              Icon={MapPin}
              label="Location"
              value={event.location}
              placeholder="+ Add location"
            />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-72 p-3">
        <div
          className="flex flex-col gap-2"
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Label htmlFor={`ploc-${event.id}`}>Location</Label>
          <Input
            id={`ploc-${event.id}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
          />
          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={commit} disabled={pending}>
              Save
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------

function AudienceEditor({ values }: { values: Values }) {
  const { event, parsed } = values;
  const { save, pending } = useFieldSave(event.id);

  function set(v: AudienceTag | null) {
    save({ audience: v });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="block w-full rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50"
          >
            <MetadataRow
              Icon={Users}
              label="Audience"
              value={parsed.audience}
              placeholder="+ Set audience"
              highlight={Boolean(parsed.audience)}
            />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-52">
        {AUDIENCE_VALUES.map((v) => (
          <DropdownMenuItem key={v} onClick={() => set(v)} disabled={pending}>
            {v}
            {parsed.audience === v && (
              <Check className="ml-auto size-3.5 text-primary" aria-hidden />
            )}
          </DropdownMenuItem>
        ))}
        {parsed.audience && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => set(null)} disabled={pending}>
              Clear
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GenderEditor({ values }: { values: Values }) {
  const { event, parsed } = values;
  const { save, pending } = useFieldSave(event.id);

  function set(v: GenderTag | null) {
    save({ gender: v });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="block w-full rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50"
          >
            <MetadataRow
              Icon={Users}
              label="Gender"
              value={parsed.gender}
              placeholder="+ Set gender"
              highlight={Boolean(parsed.gender)}
            />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-52">
        {GENDER_VALUES.map((v) => (
          <DropdownMenuItem key={v} onClick={() => set(v)} disabled={pending}>
            {v}
            {parsed.gender === v && (
              <Check className="ml-auto size-3.5 text-primary" aria-hidden />
            )}
          </DropdownMenuItem>
        ))}
        {parsed.gender && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => set(null)} disabled={pending}>
              Clear
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------

function RegistrationEditor({ values }: { values: Values }) {
  const { event, parsed } = values;
  const [open, setOpen] = useState(false);
  const { save, pending } = useFieldSave(event.id);
  const [value, setValue] = useState(parsed.registration_url ?? "");

  function commit() {
    const trimmed = value.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      toast.error("Registration URL must start with http(s)://");
      return;
    }
    save({ registration_url: trimmed === "" ? null : trimmed }, () =>
      setOpen(false),
    );
  }

  function clear() {
    setValue("");
    save({ registration_url: null }, () => setOpen(false));
  }

  if (parsed.registration_url) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md px-2 py-1 md:col-span-2 lg:col-span-3">
        <CopyField
          label="Register"
          value={parsed.registration_url}
          href={parsed.registration_url}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="text-xs"
        >
          Edit
        </Button>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger render={<span className="hidden" />} />
          <DropdownMenuContent align="end" className="w-80 p-3">
            <div
              className="flex flex-col gap-2"
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Label htmlFor={`preg-${event.id}`}>Registration URL</Label>
              <Input
                id={`preg-${event.id}`}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="https://forms.gle/…"
                autoFocus
                type="url"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commit();
                  }
                }}
              />
              <div className="flex justify-between gap-1 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clear}
                  disabled={pending}
                >
                  <X className="size-3.5" aria-hidden /> Clear
                </Button>
                <Button size="sm" onClick={commit} disabled={pending}>
                  Save
                </Button>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="block w-full rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50"
          >
            <MetadataRow
              Icon={LinkIcon}
              label="Register"
              value={null}
              placeholder="+ Add registration link"
            />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-80 p-3">
        <div
          className="flex flex-col gap-2"
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Label htmlFor={`preg-${event.id}`}>Registration URL</Label>
          <Input
            id={`preg-${event.id}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://forms.gle/…"
            autoFocus
            type="url"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
          />
          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={commit} disabled={pending}>
              Save
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------

function TagsEditor({ values }: { values: Values }) {
  const { event, parsed } = values;
  const [open, setOpen] = useState(false);
  const { save, pending } = useFieldSave(event.id);
  const [value, setValue] = useState(parsed.tags.join(", "));

  function commit() {
    const tags = value
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
    save({ tags }, () => setOpen(false));
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="block w-full rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50"
          >
            <div className="flex items-center gap-2 rounded-md px-2 py-1">
              <Users
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tags
              </span>
              {parsed.tags.length === 0 ? (
                <span className="text-sm italic text-muted-foreground/60">
                  + Add tags
                </span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {parsed.tags.map((t) => (
                    <MetadataBadge key={t} label={t} tone="tag" />
                  ))}
                </div>
              )}
            </div>
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-72 p-3">
        <div
          className="flex flex-col gap-2"
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Label htmlFor={`ptags-${event.id}`}>Tags (comma-separated)</Label>
          <Input
            id={`ptags-${event.id}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="weekly, youth, eid"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
          />
          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={commit} disabled={pending}>
              Save
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------

export function PublishedTitleEditor({
  event,
}: {
  event: CalendarEvent;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [pending, startTransition] = useTransition();

  function commit() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === event.title) {
      setTitle(event.title);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const r = await updateEventFieldAction(event.id, { title: trimmed });
      if (!r.ok) {
        toast.error(r.error);
        setTitle(event.title);
      }
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            setTitle(event.title);
            setEditing(false);
          }
        }}
        autoFocus
        disabled={pending}
        className="h-auto border-0 px-1 py-1 text-2xl font-semibold shadow-none focus-visible:bg-muted/40"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "cursor-text rounded-md px-1 py-1 text-left text-2xl font-semibold tracking-tight transition-colors hover:bg-muted/40",
        pending && "opacity-60",
      )}
    >
      {event.title}
    </button>
  );
}

// ---------------------------------------------------------------------------

export function PublishedDescriptionEditor({
  event,
  parsed,
}: {
  event: CalendarEvent;
  parsed: ParsedDescription;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(parsed.description);
  const [pending, startTransition] = useTransition();

  function commit() {
    if (value === parsed.description) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const r = await updateEventFieldAction(event.id, { description: value });
      if (!r.ok) {
        toast.error(r.error);
        setValue(parsed.description);
      }
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={4}
          autoFocus
          disabled={pending}
        />
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setValue(parsed.description);
              setEditing(false);
            }}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={commit} disabled={pending}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  if (!parsed.description) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-md border border-dashed bg-card/40 px-4 py-3 text-left text-sm italic text-muted-foreground/70 transition-colors hover:bg-muted/40"
      >
        + Add description
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="cursor-text rounded-md border bg-card px-4 py-3 text-left text-sm whitespace-pre-line text-foreground/90 transition-colors hover:bg-muted/30"
    >
      {parsed.description}
    </button>
  );
}
