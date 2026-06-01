"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ExternalLink,
  FileText,
  MapPin,
  Paperclip,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatEventWhen } from "@/lib/date-time";
import { formatRelative } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { searchAction, type SearchResults } from "./actions";

const EMPTY: SearchResults = { pages: [], files: [], events: [] };

export function SearchSurface({
  initialQuery,
  initialResults,
  variant = "page",
  onPickResult,
}: {
  initialQuery: string;
  initialResults: SearchResults;
  variant?: "page" | "palette";
  onPickResult?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const deferred = useDeferredValue(query);
  const [results, setResults] = useState<SearchResults>(initialResults);
  const [pending, startTransition] = useTransition();

  // Re-query when the debounced value changes.
  useEffect(() => {
    const q = deferred.trim();
    if (q.length < 2) {
      setResults(EMPTY);
      return;
    }
    let cancelled = false;
    startTransition(async () => {
      const next = await searchAction(q);
      if (!cancelled) setResults(next);
    });
    return () => {
      cancelled = true;
    };
  }, [deferred]);

  // Keep ?q= in sync when on the dedicated /search page so links are shareable.
  useEffect(() => {
    if (variant !== "page") return;
    const q = deferred.trim();
    const current = searchParams.get("q") ?? "";
    if (q === current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    router.replace(`/search${params.toString() ? `?${params}` : ""}`, {
      scroll: false,
    });
  }, [deferred, variant, router, searchParams]);

  const total =
    results.pages.length + results.files.length + results.events.length;

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        variant === "page" ? "" : "max-h-[70vh]",
      )}
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          autoFocus
          type="search"
          placeholder="Search pages, files, events…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div
        className={cn(
          variant === "palette" && "min-h-[200px] overflow-y-auto",
        )}
      >
        {deferred.trim().length < 2 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Type at least 2 characters.
          </p>
        ) : pending && total === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Searching…
          </p>
        ) : total === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No matches for{" "}
            <span className="font-medium text-foreground">"{deferred}"</span>.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {results.pages.length > 0 && (
              <Group label="Pages" count={results.pages.length}>
                {results.pages.map((hit) => (
                  <ResultRow
                    key={`page-${hit.id}`}
                    href={`/p/${hit.id}`}
                    title={hit.title}
                    subtitle={
                      hit.category_name
                        ? `${hit.category_name} · updated ${formatRelative(hit.updated_at)}`
                        : `Updated ${formatRelative(hit.updated_at)}`
                    }
                    snippet={hit.snippet}
                    Icon={FileText}
                    onClick={onPickResult}
                  />
                ))}
              </Group>
            )}

            {results.files.length > 0 && (
              <Group label="Files" count={results.files.length}>
                {results.files.map((hit) => (
                  <ResultRow
                    key={`file-${hit.id}`}
                    href={
                      hit.category_slug ? `/c/${hit.category_slug}` : "/"
                    }
                    title={hit.title}
                    subtitle={
                      hit.category_name
                        ? `${hit.category_name} · ${hit.file_type ?? "file"} · uploaded ${formatRelative(hit.updated_at)}`
                        : `${hit.file_type ?? "file"} · uploaded ${formatRelative(hit.updated_at)}`
                    }
                    snippet={hit.snippet}
                    Icon={Paperclip}
                    onClick={onPickResult}
                  />
                ))}
              </Group>
            )}

            {results.events.length > 0 && (
              <Group label="Events" count={results.events.length}>
                {results.events.map((hit) => (
                  <ResultRow
                    key={`event-${hit.id}`}
                    href={hit.html_link ?? "/events"}
                    title={hit.title}
                    subtitle={formatEventWhen({
                      starts_at: hit.starts_at,
                      ends_at: hit.ends_at,
                      all_day: hit.all_day,
                    })}
                    snippet={hit.location ?? ""}
                    Icon={CalendarDays}
                    external={Boolean(hit.html_link)}
                    onClick={onPickResult}
                  />
                ))}
              </Group>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Group({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label} <span className="font-normal">· {count}</span>
      </h2>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </section>
  );
}

function ResultRow({
  href,
  title,
  subtitle,
  snippet,
  Icon,
  external,
  onClick,
}: {
  href: string;
  title: string;
  subtitle: string;
  snippet: string;
  Icon: typeof FileText;
  external?: boolean;
  onClick?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        prefetch
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        onClick={onClick}
        className="group flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-brand-tint/40 focus-visible:outline-none focus-visible:bg-brand-tint/40"
      >
        <Icon
          className="size-4 shrink-0 translate-y-0.5 text-muted-foreground"
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {subtitle}
            {external && (
              <ExternalLink
                className="ml-1 inline size-3 align-text-bottom"
                aria-hidden
              />
            )}
          </span>
          {snippet && (
            <span className="line-clamp-2 text-xs text-muted-foreground/80">
              {snippet.startsWith(" ") ? snippet.slice(1) : snippet}
              {snippet.startsWith(" ") && (
                <MapPin
                  className="mr-1 inline size-3 align-text-bottom"
                  aria-hidden
                />
              )}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
