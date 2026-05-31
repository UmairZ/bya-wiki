"use client";

import { useActionState, useEffect, useTransition } from "react";
import { Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  refreshCalendarAction,
  saveIcsUrlAction,
  type SaveIcsUrlState,
} from "./actions";

export function IcsUrlForm({ currentUrl }: { currentUrl: string }) {
  const [state, formAction, pending] = useActionState<
    SaveIcsUrlState,
    FormData
  >(saveIcsUrlAction, undefined);
  const [refreshPending, startRefresh] = useTransition();

  useEffect(() => {
    if (state && "ok" in state && state.ok) toast.success("Saved.");
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state && "error" in state && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="ics-url">ICS URL</Label>
        <Input
          id="ics-url"
          name="ics_url"
          type="url"
          inputMode="url"
          defaultValue={currentUrl}
          placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to disconnect.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          <Check className="size-4" aria-hidden />
          {pending ? "Saving…" : "Save"}
        </Button>
        {currentUrl && (
          <Button
            type="button"
            variant="outline"
            disabled={refreshPending}
            onClick={() => {
              startRefresh(async () => {
                await refreshCalendarAction();
                toast.success("Calendar cache cleared.");
              });
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            {refreshPending ? "Refreshing…" : "Fetch now"}
          </Button>
        )}
      </div>
    </form>
  );
}
