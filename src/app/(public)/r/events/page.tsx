import Image from "next/image";
import type { Metadata } from "next";
import { ArrowUpRight, Calendar, Lock, MapPin } from "lucide-react";
import { APP_NAME, LOGO_LOCKUP_SRC } from "@/lib/brand";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCalendarEvents, getIcsUrl } from "@/lib/calendar/ics";
import { parseDescription } from "@/lib/calendar/markers";
import { cn } from "@/lib/utils";
import { flyerPublicUrl } from "@/lib/flyer-url";
import {
  dayOfMonthInOrgTz,
  formatEventWhen,
  formatMonthShort,
} from "@/lib/date-time";

// Cache the rendered HTML for a few minutes — the ICS feed itself is cached
// for 15 min and flyer rows rarely change. Visitors landing from bit.ly
// don't need second-by-second freshness.
export const revalidate = 300;

export const metadata: Metadata = {
  title: `Upcoming events — ${APP_NAME}`,
  description: "Upcoming events from Bilal Youth Affairs.",
  openGraph: {
    title: `Upcoming events — ${APP_NAME}`,
    description: "Upcoming events from Bilal Youth Affairs.",
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `Upcoming events — ${APP_NAME}`,
    description: "Upcoming events from Bilal Youth Affairs.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

type Tile = {
  uid: string;
  title: string;
  flyer_url: string;
  registration_url: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  registration_closed: boolean;
};

async function loadTiles(): Promise<Tile[]> {
  const icsUrl = await getIcsUrl();
  if (!icsUrl) return [];

  let events;
  try {
    events = await getCalendarEvents({ icsUrl });
  } catch {
    return [];
  }

  // Filter: future-or-today only.
  const now = Date.now();
  const upcoming = events.filter((e) => {
    const t = (e.ends_at ? new Date(e.ends_at) : new Date(e.starts_at)).getTime();
    return t >= now;
  });
  if (upcoming.length === 0) return [];

  // Look up flyers via admin client (bypasses RLS; safe — server-side, this
  // route is intentionally public anyway).
  const admin = createSupabaseAdminClient();
  const baseUids = Array.from(
    new Set(upcoming.map((e) => e.id.split("::")[0])),
  );
  const { data: flyers } = await admin
    .from("event_flyers")
    .select(
      "google_event_uid, flyer_storage_path, registration_closed, hidden_from_public",
    )
    .in("google_event_uid", baseUids);
  const flyerByUid = new Map(
    (flyers ?? []).map((f) => [f.google_event_uid, f]),
  );

  const tiles: Tile[] = [];
  for (const event of upcoming) {
    const uid = event.id.split("::")[0];
    const flyer = flyerByUid.get(uid);
    if (!flyer) continue;
    if (flyer.hidden_from_public) continue;
    const parsed = parseDescription(event.description);
    if (!parsed.registration_url) continue;
    tiles.push({
      uid: event.id,
      title: event.title,
      flyer_url: flyerPublicUrl(flyer.flyer_storage_path),
      registration_url: parsed.registration_url,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      all_day: event.all_day,
      location: event.location,
      registration_closed: flyer.registration_closed,
    });
  }

  // Sort ascending by start.
  tiles.sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  return tiles;
}

export default async function PublicEventsPage() {
  const tiles = await loadTiles();

  return (
    <div className="relative min-h-svh overflow-x-clip bg-gradient-to-b from-brand-tint/40 via-background to-background">
      {/* Soft decorative blobs — give the page a sense of place beyond
          plain white. Pointer-events-none keeps them inert. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-32 -top-32 size-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-32 top-1/3 size-[24rem] rounded-full bg-amber-300/15 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8 md:gap-14 md:py-16">
        <header className="flex flex-col items-center gap-5 text-center">
          {/* Plain img — Next/Image's required width+height + the lockup's
              unknown aspect ratio fight each other in dev warnings, and the
              optimization win on a small static org logo is nil. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_LOCKUP_SRC}
            alt={`${APP_NAME} logo`}
            className="h-16 w-auto md:h-20"
          />
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Upcoming Events
            </h1>
            <p className="max-w-md text-balance text-sm text-muted-foreground md:text-base">
              Join our community for talks, halaqas, and gatherings throughout
              the year.
            </p>
          </div>
        </header>

        {tiles.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/40 px-8 py-16 text-center">
            <Calendar
              className="size-8 text-muted-foreground/50"
              aria-hidden
            />
            <p className="text-base font-medium">No upcoming events right now</p>
            <p className="text-sm text-muted-foreground">
              Check back soon — new events are added all the time.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-6">
            {tiles.map((t) => (
              <li key={t.uid}>
                <a
                  href={t.registration_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${t.title} — register`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <Image
                      src={t.flyer_url}
                      alt={t.title}
                      fill
                      sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                      className={cn(
                        "object-cover transition-transform duration-300 group-hover:scale-[1.04]",
                        t.registration_closed && "grayscale-[60%]",
                      )}
                      unoptimized
                    />
                    {/* Floating date chip in top-left — readable on any flyer
                        color via the white background + ring. */}
                    <div className="absolute left-3 top-3 flex flex-col items-center rounded-lg bg-background/70 px-2.5 py-1.5 shadow-md ring-1 ring-foreground/10 backdrop-blur-md">
                      <span className="text-[10px] font-bold uppercase leading-none tracking-wider text-primary">
                        {formatMonthShort(t.starts_at)}
                      </span>
                      <span className="text-xl font-bold leading-none tabular-nums text-foreground">
                        {dayOfMonthInOrgTz(t.starts_at)}
                      </span>
                    </div>
                    {t.registration_closed && (
                      <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-foreground/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-background shadow-md backdrop-blur">
                        <Lock className="size-3" aria-hidden />
                        Closed
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 p-4">
                    <h2 className="line-clamp-2 text-base font-semibold leading-snug">
                      {t.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {formatEventWhen({
                        starts_at: t.starts_at,
                        ends_at: t.ends_at,
                        all_day: t.all_day,
                      })}
                    </p>
                    {t.location && (
                      <p className="flex min-w-0 items-start gap-1.5 text-xs text-muted-foreground">
                        <MapPin
                          className="mt-0.5 size-3 shrink-0"
                          aria-hidden
                        />
                        <span className="line-clamp-2">{t.location}</span>
                      </p>
                    )}
                    {t.registration_closed ? (
                      <div className="mt-1 flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                        <span>View flyer</span>
                        <ArrowUpRight
                          className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          aria-hidden
                        />
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-1 text-sm font-medium text-primary transition-colors group-hover:text-primary/80">
                        <span>Register</span>
                        <ArrowUpRight
                          className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          aria-hidden
                        />
                      </div>
                    )}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}

        <footer className="mt-auto flex flex-col items-center gap-1.5 border-t pt-8 text-center text-xs text-muted-foreground">
          <p className="text-sm font-medium text-foreground/80">
            Bilal Masjid · Beaverton, Oregon
          </p>
          <p>4115 SW 160th Ave, Beaverton, OR 97007</p>
          <a
            href="https://bilalmasjid.com"
            className="mt-1 inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
            target="_blank"
            rel="noopener noreferrer"
          >
            bilalmasjid.com
            <ArrowUpRight className="size-3" aria-hidden />
          </a>
        </footer>
      </div>
    </div>
  );
}
