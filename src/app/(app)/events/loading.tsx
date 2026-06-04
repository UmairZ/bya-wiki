import { Skeleton } from "@/components/ui/skeleton";

// Four stage columns; static count matches the seeded event_stages so the
// shell paints accurately while the server fetches the real data.
const STAGE_LABELS = ["Scoping", "Pre-event", "Day-of", "Wrap-up"];

function StageSkeleton({ label }: { label: string }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-baseline justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
          {label}
        </h3>
        <span className="text-[10px] text-muted-foreground/40">…</span>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-[88px] w-full rounded-md" />
        <Skeleton className="h-[72px] w-full rounded-md" />
      </div>
    </section>
  );
}

export default function EventsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <Skeleton className="h-4 w-[280px]" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-[110px] rounded-md" />
          <Skeleton className="h-9 w-[100px] rounded-md" />
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Upcoming events
        </h2>
        <div className="grid auto-rows-min gap-3 md:grid-cols-2 lg:grid-cols-4">
          {STAGE_LABELS.map((l) => (
            <StageSkeleton key={l} label={l} />
          ))}
        </div>
      </section>

      <div className="flex items-center gap-2 px-2 py-2 text-sm">
        <Skeleton className="size-4 rounded" />
        <Skeleton className="h-4 w-[110px]" />
        <Skeleton className="h-3 w-[100px]" />
      </div>
    </div>
  );
}
