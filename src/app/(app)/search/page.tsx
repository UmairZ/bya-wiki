import { searchAction } from "./actions";
import { SearchSurface } from "./search-results";

export const metadata = { title: "Search" };

type SearchParams = Promise<{ q?: string }>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "" } = await searchParams;
  const initial = q.trim().length >= 2 ? await searchAction(q) : { pages: [], files: [], events: [] };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Search across pages, files, and events. <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[11px] font-medium">⌘K</kbd>{" "}
          opens this from anywhere.
        </p>
      </header>

      <SearchSurface initialQuery={q} initialResults={initial} variant="page" />
    </div>
  );
}
