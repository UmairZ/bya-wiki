import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function MetadataRowSkeleton() {
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1">
      <Skeleton className="size-3.5 rounded-sm" />
      <Skeleton className="h-3 w-14" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export default function EventDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
      <nav className="flex items-center gap-1 text-sm">
        <span className="flex items-center gap-1 text-muted-foreground">
          <ChevronLeft className="size-4" aria-hidden />
          Events
        </span>
        <span className="text-muted-foreground/60">›</span>
        <Skeleton className="h-4 w-48" />
      </nav>

      <header className="flex flex-col gap-4">
        <Skeleton className="h-8 w-[60%] max-w-[480px]" />

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <Skeleton className="aspect-square w-full rounded-lg" />

          <div className="flex flex-col gap-4">
            <div className="rounded-lg border bg-card p-3">
              <div className="grid gap-1 sm:grid-cols-2">
                <MetadataRowSkeleton />
                <MetadataRowSkeleton />
                <MetadataRowSkeleton />
                <MetadataRowSkeleton />
                <MetadataRowSkeleton />
                <MetadataRowSkeleton />
              </div>
            </div>
            <Skeleton className="h-8 w-44 rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Tasks
        </h2>
        {/* Progress summary, then the stage rail (vertical checklist) */}
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-lg" />
          ))}
        </div>
      </section>
    </div>
  );
}
