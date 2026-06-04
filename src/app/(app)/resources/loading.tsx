import { Skeleton } from "@/components/ui/skeleton";

function SpaceCardSkeleton() {
  return (
    <div className="flex h-full items-start gap-3 rounded-lg border bg-card p-4">
      <Skeleton className="size-10 shrink-0 rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export default function ResourcesLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Resources</h1>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Spaces
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <SpaceCardSkeleton />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recently updated
        </h2>
        <div className="flex flex-col divide-y rounded-lg border bg-card">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-4 flex-1 max-w-[280px]" />
              <Skeleton className="hidden h-3 w-16 sm:block" />
              <Skeleton className="hidden h-3 w-24 md:block" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
