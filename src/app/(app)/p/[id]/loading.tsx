import { Skeleton } from "@/components/ui/skeleton";

export default function PageLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl gap-0 px-4 py-6 md:px-8 md:py-10">
      <article className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
        {/* Breadcrumb */}
        <Skeleton className="h-3 w-48" />

        {/* Header: meta row + title */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
          <Skeleton className="h-9 w-[70%] max-w-[460px]" />
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[94%]" />
          <Skeleton className="h-4 w-[88%]" />
          <Skeleton className="h-4 w-[55%]" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[80%]" />
          <Skeleton className="h-4 w-[40%]" />
        </div>
      </article>
    </div>
  );
}
