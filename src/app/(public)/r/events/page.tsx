import Image from "next/image";
import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
// eslint-disable-next-line @next/next/no-img-element -- intentional: the
// lockup logo is small + cached + we want unconstrained aspect ratio
import { APP_NAME, LOGO_LOCKUP_SRC } from "@/lib/brand";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCalendarEvents, getIcsUrl } from "@/lib/calendar/ics";
import { parseDescription } from "@/lib/calendar/markers";
import { flyerPublicUrl } from "@/lib/flyer-url";
import { formatMonthDay } from "@/lib/date-time";

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
    .select("google_event_uid, flyer_storage_path")
    .in("google_event_uid", baseUids);
  const flyerByUid = new Map(
    (flyers ?? []).map((f) => [f.google_event_uid, f.flyer_storage_path]),
  );

  const tiles: Tile[] = [];
  for (const event of upcoming) {
    const uid = event.id.split("::")[0];
    const flyerPath = flyerByUid.get(uid);
    if (!flyerPath) continue;
    const parsed = parseDescription(event.description);
    if (!parsed.registration_url) continue;
    tiles.push({
      uid: event.id,
      title: event.title,
      flyer_url: flyerPublicUrl(flyerPath),
      registration_url: parsed.registration_url,
      starts_at: event.starts_at,
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:py-10">
      <header className="flex flex-col items-center gap-3">
        {/* Plain img — Next/Image's required width+height + the lockup's
            unknown aspect ratio fight each other in dev warnings, and the
            optimization win on a small static org logo is nil. */}
        <img
          src={LOGO_LOCKUP_SRC}
          alt={`${APP_NAME} logo`}
          className="h-20 w-auto"
        />
        <h1 className="sr-only">Upcoming events — {APP_NAME}</h1>
      </header>

      {tiles.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-card/40 px-6 py-16 text-center text-sm text-muted-foreground">
          Nothing on the calendar right now. Check back soon.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4">
          {tiles.map((t) => (
            <li key={t.uid}>
              <a
                href={t.registration_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t.title} — ${formatMonthDay(t.starts_at)} — register`}
                className="group relative block aspect-square overflow-hidden rounded-lg ring-1 ring-foreground/10 shadow-sm transition-all duration-200 hover:scale-[1.03] hover:shadow-lg hover:ring-primary/40 focus-visible:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Image
                  src={t.flyer_url}
                  alt={t.title}
                  fill
                  sizes="(min-width: 640px) 384px, 50vw"
                  className="object-cover"
                  unoptimized
                />
                {/* Subtle always-visible affordance: small icon badge in
                    the top-right corner. Background ring + bg makes it
                    readable over any flyer color. Grows on hover. */}
                <span
                  className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/85 text-foreground/80 shadow-sm ring-1 ring-foreground/10 backdrop-blur transition-all group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground"
                  aria-hidden
                >
                  <ExternalLink className="size-3.5" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
