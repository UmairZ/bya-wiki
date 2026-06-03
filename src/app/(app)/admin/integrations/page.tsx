import Link from "next/link";
import { CalendarDays, ExternalLink, Info } from "lucide-react";
import { requireOwner } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IcsUrlForm } from "./ics-url-form";
import { GoogleSection } from "./google-section";

export const metadata = { title: "Integrations" };

type SearchParams = Promise<{
  google?: string;
  google_msg?: string;
}>;

async function loadIcsUrl(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("app_settings")
    .select("google_calendar_ics_url")
    .eq("id", 1)
    .single();
  return data?.google_calendar_ics_url ?? "";
}

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireOwner();
  const { google, google_msg } = await searchParams;
  const currentUrl = await loadIcsUrl();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          External sources the wiki pulls from and writes to.
        </p>
      </header>

      {google === "error" && (
        <Alert variant="destructive">
          <AlertDescription>
            Couldn't connect Google Calendar
            {google_msg ? `: ${google_msg}` : "."}
          </AlertDescription>
        </Alert>
      )}
      {google === "ok" && (
        <Alert>
          <AlertDescription>
            Google Calendar connected. Pick a calendar to write to below.
          </AlertDescription>
        </Alert>
      )}

      <GoogleSection />

      <section className="flex flex-col gap-4 rounded-lg border bg-card p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand-tint-foreground">
            <CalendarDays className="size-5" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-base font-semibold">
              Calendar feed (read path)
            </h2>
            <p className="text-sm text-muted-foreground">
              Paste the calendar's ICS URL. The wiki fetches it with a
              15-minute cache and renders events on{" "}
              <Link
                href="/events"
                className="text-primary underline-offset-4 hover:underline"
              >
                /events
              </Link>{" "}
              (Kanban + Past events). The OAuth connection above handles writes.
            </p>
          </div>
        </div>

        <IcsUrlForm currentUrl={currentUrl} />

        <details className="rounded-md border bg-muted/30 p-3 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 font-medium text-foreground [&::-webkit-details-marker]:hidden">
            <Info className="size-4 text-muted-foreground" aria-hidden />
            How to find the ICS URL
          </summary>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted-foreground">
            <li>
              Open{" "}
              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Google Calendar
                <ExternalLink className="size-3" aria-hidden />
              </a>
              .
            </li>
            <li>
              Hover the calendar in the left sidebar → click the ⋮ menu →{" "}
              <em>Settings and sharing</em>.
            </li>
            <li>
              Scroll to <em>Integrate calendar</em>. Copy the{" "}
              <strong>Secret address in iCal format</strong> (or the public one
              if the calendar is published).
            </li>
            <li>Paste it above and save.</li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            The secret URL acts like a password — anyone who has it can read
            the calendar.
          </p>
        </details>
      </section>
    </div>
  );
}
