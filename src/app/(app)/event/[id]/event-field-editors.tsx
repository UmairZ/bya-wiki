"use client";

import { useState } from "react";
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
import {
  AUDIENCE_VALUES,
  GENDER_VALUES,
  type AudienceTag,
  type GenderTag,
} from "@/lib/supabase/types";
import {
  combineDateTime,
  formatFullDateString,
  formatTime,
  isoToDateOnlyInput,
  isoToTimeInput,
} from "@/lib/date-time";
import { MetadataBadge, MetadataRow } from "./metadata-block";
import { CopyEventButton, type EventForCopy } from "./copy-event-button";

// Normalized view of the editable metadata, so a draft (DB row) and a
// published event (Google event + parsed description) drive the same editors.
export type FieldValues = {
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  audience: AudienceTag | null;
  gender: GenderTag | null;
  registration_url: string | null;
  tags: string[];
};

// Normalized patch the editors emit; each surface adapts it to its own action
// (draft → DraftEventUpdate with free_tags; published → EventFieldPatch).
export type FieldPatch = Partial<{
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  audience: AudienceTag | null;
  gender: GenderTag | null;
  registration_url: string | null;
  tags: string[];
  description: string;
}>;

export type SaveFn = (patch: FieldPatch, onSuccess?: () => void) => void;

type EditorProps = {
  values: FieldValues;
  save: SaveFn;
  pending: boolean;
  idPrefix: string;
  required?: boolean;
  allowClearDate?: boolean;
};

const TRIGGER_CLS =
  "block w-full min-w-0 rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50";

/** The bordered metadata card: copy button + the six field editors. */
export function EventFieldsGrid({
  values,
  save,
  pending,
  idPrefix,
  required = false,
  allowClearDate = false,
  copyData,
}: EditorProps & { copyData: EventForCopy }) {
  return (
    <div className="relative rounded-lg border bg-card p-3">
      <CopyEventButton event={copyData} className="absolute right-2 top-2 z-10" />
      <div className="grid gap-1 pt-7 sm:grid-cols-2 sm:pt-0">
        <DateTimeEditor
          values={values}
          save={save}
          pending={pending}
          idPrefix={idPrefix}
          required={required}
          allowClearDate={allowClearDate}
        />
        <LocationEditor
          values={values}
          save={save}
          pending={pending}
          idPrefix={idPrefix}
          required={required}
        />
        <AudienceEditor values={values} save={save} pending={pending} idPrefix={idPrefix} required={required} />
        <GenderEditor values={values} save={save} pending={pending} idPrefix={idPrefix} required={required} />
        <RegistrationEditor
          values={values}
          save={save}
          pending={pending}
          idPrefix={idPrefix}
          required={required}
        />
        <TagsEditor values={values} save={save} pending={pending} idPrefix={idPrefix} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date + Time (combined)
// ---------------------------------------------------------------------------

function DateTimeEditor({
  values,
  save,
  pending,
  idPrefix,
  required,
  allowClearDate,
}: EditorProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(isoToDateOnlyInput(values.starts_at));
  const [startTime, setStartTime] = useState(isoToTimeInput(values.starts_at));
  const [endTime, setEndTime] = useState(isoToTimeInput(values.ends_at));
  const [allDay, setAllDay] = useState(values.all_day);

  function commit() {
    if (!date) {
      // Only a clearable surface (drafts) may persist "no date".
      if (allowClearDate) {
        save({ starts_at: null, ends_at: null, all_day: false }, () =>
          setOpen(false),
        );
      }
      return;
    }
    const startIso = combineDateTime(date, startTime, allDay);
    if (!startIso) return;
    const endIso =
      endTime && !allDay ? combineDateTime(date, endTime, false) : null;
    save({ starts_at: startIso, ends_at: endIso, all_day: allDay }, () =>
      setOpen(false),
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

  const dateLabel = values.starts_at
    ? formatFullDateString(values.starts_at)
    : null;
  const timeLabel = values.starts_at
    ? values.all_day
      ? "All day"
      : values.ends_at
        ? `${formatTime(values.starts_at)} – ${formatTime(values.ends_at)}`
        : formatTime(values.starts_at)
    : null;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <button type="button" className={TRIGGER_CLS}>
              <MetadataRow
                Icon={CalendarDays}
                label="Date"
                value={dateLabel}
                placeholder="+ Add date"
                required={required}
              />
            </button>
          }
        />
        <DropdownMenuContent align="start" className="w-72 p-3">
          <div
            className="flex flex-col gap-2"
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Label htmlFor={`${idPrefix}-date`}>Date</Label>
            <Input
              id={`${idPrefix}-date`}
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
                    htmlFor={`${idPrefix}-start`}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    Start
                  </Label>
                  <Input
                    id={`${idPrefix}-start`}
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor={`${idPrefix}-end`}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    End
                  </Label>
                  <Input
                    id={`${idPrefix}-end`}
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-between gap-1 pt-1">
              {allowClearDate && dateLabel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clear}
                  disabled={pending}
                >
                  <X className="size-3.5" aria-hidden /> Clear
                </Button>
              )}
              <Button
                size="sm"
                className="ml-auto"
                onClick={commit}
                disabled={pending}
              >
                Save
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {timeLabel && <MetadataRow Icon={Clock} label="Time" value={timeLabel} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

function LocationEditor({ values, save, pending, idPrefix, required }: EditorProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(values.location ?? "");

  function commit() {
    const trimmed = value.trim();
    save({ location: trimmed === "" ? null : trimmed }, () => setOpen(false));
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button type="button" className={TRIGGER_CLS}>
            <MetadataRow
              Icon={MapPin}
              label="Location"
              value={values.location}
              placeholder="+ Add location"
              required={required}
            />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-72 p-3">
        {/* Stop key events bubbling to the Menu's typeahead so text inputs
            receive keystrokes normally. */}
        <div className="flex flex-col gap-2" onKeyDown={(e) => e.stopPropagation()}>
          <Label htmlFor={`${idPrefix}-loc`}>Location</Label>
          <Input
            id={`${idPrefix}-loc`}
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

function AudienceEditor({ values, save, pending, required }: EditorProps) {
  function set(v: AudienceTag | null) {
    save({ audience: v });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" className={TRIGGER_CLS}>
            <MetadataRow
              Icon={Users}
              label="Audience"
              value={values.audience}
              placeholder="+ Set audience"
              highlight={Boolean(values.audience)}
              required={required}
            />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-52">
        {AUDIENCE_VALUES.map((v) => (
          <DropdownMenuItem key={v} onClick={() => set(v)} disabled={pending}>
            {v}
            {values.audience === v && (
              <Check className="ml-auto size-3.5 text-primary" aria-hidden />
            )}
          </DropdownMenuItem>
        ))}
        {values.audience && (
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

function GenderEditor({ values, save, pending, required }: EditorProps) {
  function set(v: GenderTag | null) {
    save({ gender: v });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" className={TRIGGER_CLS}>
            <MetadataRow
              Icon={Users}
              label="Gender"
              value={values.gender}
              placeholder="+ Set gender"
              highlight={Boolean(values.gender)}
              required={required}
            />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-52">
        {GENDER_VALUES.map((v) => (
          <DropdownMenuItem key={v} onClick={() => set(v)} disabled={pending}>
            {v}
            {values.gender === v && (
              <Check className="ml-auto size-3.5 text-primary" aria-hidden />
            )}
          </DropdownMenuItem>
        ))}
        {values.gender && (
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

function RegistrationEditor({ values, save, pending, idPrefix, required }: EditorProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(values.registration_url ?? "");

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

  const displayValue = values.registration_url
    ? values.registration_url.replace(/^https?:\/\//, "")
    : null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button type="button" className={TRIGGER_CLS}>
            <MetadataRow
              Icon={LinkIcon}
              label="Register"
              value={displayValue}
              placeholder="+ Add registration link"
              required={required}
            />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-80 p-3">
        <div className="flex flex-col gap-2" onKeyDown={(e) => e.stopPropagation()}>
          <Label htmlFor={`${idPrefix}-reg`}>Registration URL</Label>
          <Input
            id={`${idPrefix}-reg`}
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
            {values.registration_url && (
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
  );
}

// ---------------------------------------------------------------------------
// Tags (free-form)
// ---------------------------------------------------------------------------

function TagsEditor({ values, save, pending, idPrefix }: EditorProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(values.tags.join(", "));

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
          <button type="button" className={TRIGGER_CLS}>
            <div className="flex items-center gap-2 rounded-md px-2 py-1 text-left">
              <Users
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tags
              </span>
              {values.tags.length === 0 ? (
                <span className="text-sm italic text-muted-foreground/60">
                  + Add tags
                </span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {values.tags.map((t) => (
                    <MetadataBadge key={t} label={t} tone="tag" />
                  ))}
                </div>
              )}
            </div>
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-72 p-3">
        <div className="flex flex-col gap-2" onKeyDown={(e) => e.stopPropagation()}>
          <Label htmlFor={`${idPrefix}-tags`}>Tags (comma-separated)</Label>
          <Input
            id={`${idPrefix}-tags`}
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
// Description (inline click-to-edit)
// ---------------------------------------------------------------------------

export function InlineDescriptionEditor({
  value: saved,
  save,
  pending,
}: {
  value: string;
  save: SaveFn;
  pending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(saved);

  function commit() {
    if (value === saved) {
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
              setValue(saved);
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

  if (!saved) {
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
      {saved}
    </button>
  );
}
