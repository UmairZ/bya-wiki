"use client";

import { useState, useTransition } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
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
  type DraftEventRow,
  type DraftEventUpdate,
  type GenderTag,
} from "@/lib/supabase/types";
import { updateDraftAction } from "@/app/(app)/drafts/actions";
import { formatFullDateString, formatTime } from "@/lib/date-time";
import { MetadataBadge, MetadataRow } from "./metadata-block";
import { CopyField } from "./copy-field";

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

export function DraftFieldsEditor({ draft }: { draft: DraftEventRow }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1 rounded-lg border bg-card p-3 md:grid-cols-2 lg:grid-cols-3">
        <DateTimeEditor draft={draft} />
        <LocationEditor draft={draft} />
        <AudienceEditor draft={draft} />
        <GenderEditor draft={draft} />
        <RegistrationEditor draft={draft} />
        <TagsEditor draft={draft} />
      </div>

      <DescriptionEditor draft={draft} />
    </div>
  );
}

function useFieldSave(draft: DraftEventRow) {
  const [pending, startTransition] = useTransition();
  function save(fields: DraftEventUpdate, onSuccess?: () => void) {
    startTransition(async () => {
      const r = await updateDraftAction(draft.id, fields);
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
// Date + Time (combined)
// ---------------------------------------------------------------------------

function DateTimeEditor({ draft }: { draft: DraftEventRow }) {
  const [open, setOpen] = useState(false);
  const { save, pending } = useFieldSave(draft);
  const [date, setDate] = useState(isoToDateInput(draft.starts_at));
  const [startTime, setStartTime] = useState(isoToTimeInput(draft.starts_at));
  const [endTime, setEndTime] = useState(isoToTimeInput(draft.ends_at));
  const [allDay, setAllDay] = useState(draft.all_day);

  function commit() {
    if (!date) {
      // Clear both date + ends_at.
      save({ starts_at: null, ends_at: null, all_day: false }, () =>
        setOpen(false),
      );
      return;
    }
    const startIso = combineDateTime(date, startTime, allDay);
    const endIso =
      endTime && !allDay ? combineDateTime(date, endTime, false) : null;
    save(
      { starts_at: startIso, ends_at: endIso, all_day: allDay },
      () => setOpen(false),
    );
  }

  function clear() {
    save({ starts_at: null, ends_at: null, all_day: false }, () => {
      setDate("");
      setStartTime("");
      setEndTime("");
      setOpen(false);
    });
  }

  const dateLabel = draft.starts_at ? formatFullDateString(draft.starts_at) : null;
  const timeLabel = draft.starts_at
    ? draft.all_day
      ? "All day"
      : draft.ends_at
        ? `${formatTime(draft.starts_at)} – ${formatTime(draft.ends_at)}`
        : formatTime(draft.starts_at)
    : null;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <button type="button" className="block w-full rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50">
              <MetadataRow
                Icon={CalendarDays}
                label="Date"
                value={dateLabel}
                placeholder="+ Add date"
              />
            </button>
          }
        />
        <DropdownMenuContent align="start" className="w-72 p-3">
          <div
            className="flex flex-col gap-2"
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Label htmlFor={`d-${draft.id}`}>Date</Label>
            <Input
              id={`d-${draft.id}`}
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
                  <Label htmlFor={`s-${draft.id}`} className="text-[10px] uppercase tracking-wider text-muted-foreground">Start</Label>
                  <Input
                    id={`s-${draft.id}`}
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`e-${draft.id}`} className="text-[10px] uppercase tracking-wider text-muted-foreground">End</Label>
                  <Input
                    id={`e-${draft.id}`}
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-between gap-1 pt-1">
              {dateLabel && (
                <Button variant="ghost" size="sm" onClick={clear} disabled={pending}>
                  <X className="size-3.5" aria-hidden /> Clear
                </Button>
              )}
              <Button size="sm" className="ml-auto" onClick={commit} disabled={pending}>
                Save
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {timeLabel && (
        <MetadataRow Icon={Clock} label="Time" value={timeLabel} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

function LocationEditor({ draft }: { draft: DraftEventRow }) {
  const [open, setOpen] = useState(false);
  const { save, pending } = useFieldSave(draft);
  const [value, setValue] = useState(draft.location ?? "");

  function commit() {
    const trimmed = value.trim();
    save({ location: trimmed === "" ? null : trimmed }, () => setOpen(false));
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button type="button" className="block w-full rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50">
            <MetadataRow
              Icon={MapPin}
              label="Location"
              value={draft.location}
              placeholder="+ Add location"
            />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-72 p-3">
        {/* Stop key events bubbling to the Menu's typeahead so text inputs
            receive keystrokes normally. */}
        <div
          className="flex flex-col gap-2"
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Label htmlFor={`loc-${draft.id}`}>Location</Label>
          <Input
            id={`loc-${draft.id}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. Bilal Masjid, Main Hall"
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
// Audience + Gender
// ---------------------------------------------------------------------------

function AudienceEditor({ draft }: { draft: DraftEventRow }) {
  const { save, pending } = useFieldSave(draft);

  function set(value: AudienceTag | null) {
    save({ audience: value });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" className="block w-full rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50">
            <MetadataRow
              Icon={Users}
              label="Audience"
              value={draft.audience}
              placeholder="+ Set audience"
              highlight={Boolean(draft.audience)}
            />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-52">
        {AUDIENCE_VALUES.map((v) => (
          <DropdownMenuItem key={v} onClick={() => set(v)} disabled={pending}>
            {v}
            {draft.audience === v && (
              <Check className="ml-auto size-3.5 text-primary" aria-hidden />
            )}
          </DropdownMenuItem>
        ))}
        {draft.audience && (
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

function GenderEditor({ draft }: { draft: DraftEventRow }) {
  const { save, pending } = useFieldSave(draft);

  function set(value: GenderTag | null) {
    save({ gender: value });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" className="block w-full rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50">
            <MetadataRow
              Icon={Users}
              label="Gender"
              value={draft.gender}
              placeholder="+ Set gender"
              highlight={Boolean(draft.gender)}
            />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-52">
        {GENDER_VALUES.map((v) => (
          <DropdownMenuItem key={v} onClick={() => set(v)} disabled={pending}>
            {v}
            {draft.gender === v && (
              <Check className="ml-auto size-3.5 text-primary" aria-hidden />
            )}
          </DropdownMenuItem>
        ))}
        {draft.gender && (
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
// Registration URL
// ---------------------------------------------------------------------------

function RegistrationEditor({ draft }: { draft: DraftEventRow }) {
  const [open, setOpen] = useState(false);
  const { save, pending } = useFieldSave(draft);
  const [value, setValue] = useState(draft.registration_url ?? "");

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

  if (draft.registration_url) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1 md:col-span-2 lg:col-span-3",
        )}
      >
        <CopyField
          label="Register"
          value={draft.registration_url}
          href={draft.registration_url}
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
              <Label htmlFor={`reg-${draft.id}`}>Registration URL</Label>
              <Input
                id={`reg-${draft.id}`}
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
              <div className="flex justify-end gap-1 pt-1">
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
          <button type="button" className="block w-full rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50">
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
          <Label htmlFor={`reg-${draft.id}`}>Registration URL</Label>
          <Input
            id={`reg-${draft.id}`}
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
// Tags (free-form)
// ---------------------------------------------------------------------------

function TagsEditor({ draft }: { draft: DraftEventRow }) {
  const [open, setOpen] = useState(false);
  const { save, pending } = useFieldSave(draft);
  const [value, setValue] = useState(draft.free_tags.join(", "));

  function commit() {
    const tags = value
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
    save({ free_tags: tags }, () => setOpen(false));
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button type="button" className="block w-full rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50">
            <div className="flex items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/50">
              <Users className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tags
              </span>
              {draft.free_tags.length === 0 ? (
                <span className="text-sm italic text-muted-foreground/60">
                  + Add tags
                </span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {draft.free_tags.map((t) => (
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
          <Label htmlFor={`tags-${draft.id}`}>Tags (comma-separated)</Label>
          <Input
            id={`tags-${draft.id}`}
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
// Description
// ---------------------------------------------------------------------------

function DescriptionEditor({ draft }: { draft: DraftEventRow }) {
  const [editing, setEditing] = useState(false);
  const { save, pending } = useFieldSave(draft);
  const [value, setValue] = useState(draft.description);

  function commit() {
    if (value === draft.description) {
      setEditing(false);
      return;
    }
    save({ description: value }, () => setEditing(false));
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
              setValue(draft.description);
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

  if (!draft.description) {
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
      {draft.description}
    </button>
  );
}
