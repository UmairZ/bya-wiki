"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { selectGoogleCalendarAction } from "./actions";
import type { GoogleCalendarListItem } from "@/lib/calendar/google";

export function GoogleCalendarPicker({
  calendars,
  selectedId,
}: {
  calendars: GoogleCalendarListItem[];
  selectedId: string | null;
}) {
  const [value, setValue] = useState(selectedId ?? "");
  const [pending, startTransition] = useTransition();

  function handleSave() {
    if (!value) {
      toast.error("Pick a calendar first.");
      return;
    }
    const cal = calendars.find((c) => c.id === value);
    if (!cal) {
      toast.error("Calendar not found.");
      return;
    }
    startTransition(async () => {
      const result = await selectGoogleCalendarAction(cal.id, cal.summary);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Writing to "${cal.summary}".`);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="cal-pick">Calendar to write to</Label>
      <div className="flex flex-wrap items-center gap-2">
        <select
          id="cal-pick"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex h-10 min-w-[14rem] flex-1 items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Pick a calendar…</option>
          {calendars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.summary}
              {c.primary ? " (primary)" : ""}
            </option>
          ))}
        </select>
        <Button onClick={handleSave} disabled={pending || value === selectedId}>
          <Check className="size-4" aria-hidden />
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Only calendars where the connected account has writer access show up.
      </p>
    </div>
  );
}
