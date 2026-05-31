"use client";

import { useEffect, useState } from "react";
import { ChevronUp, List } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { TocEntry } from "@/lib/tiptap/process-html";

function useActiveHeading(entries: TocEntry[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(
    entries[0]?.id ?? null,
  );

  useEffect(() => {
    if (entries.length === 0) return;
    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((r) => r.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: [0, 1] },
    );
    for (const entry of entries) {
      const el = document.getElementById(entry.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [entries]);

  return activeId;
}

function TocItem({
  entry,
  active,
}: {
  entry: TocEntry;
  active: boolean;
}) {
  return (
    <li>
      <a
        href={`#${entry.id}`}
        className={cn(
          "-ml-px block border-l-2 py-1 text-sm transition-colors",
          entry.level === 1 && "pl-3 font-medium",
          entry.level === 2 && "pl-4",
          entry.level === 3 && "pl-6 text-[13px]",
          active
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
        )}
      >
        {entry.text}
      </a>
    </li>
  );
}

/**
 * Desktop sticky right rail. Render as a sibling of the article.
 */
export function TableOfContentsDesktop({ entries }: { entries: TocEntry[] }) {
  const activeId = useActiveHeading(entries);
  if (entries.length === 0) return null;
  return (
    <nav
      aria-label="On this page"
      className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-52 shrink-0 self-start overflow-y-auto xl:block"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        On this page
      </p>
      <ul className="border-l">
        {entries.map((e) => (
          <TocItem key={e.id} entry={e} active={e.id === activeId} />
        ))}
      </ul>
    </nav>
  );
}

/**
 * Floating mobile/tablet TOC. Shows a pill near the bottom of the screen
 * (above the bottom tab bar) with the current section name. Tap to open
 * the full list in a centered dialog.
 */
export function TableOfContentsMobile({ entries }: { entries: TocEntry[] }) {
  const activeId = useActiveHeading(entries);
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;

  const active = entries.find((e) => e.id === activeId) ?? entries[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open on-this-page navigation"
        className={cn(
          "xl:hidden",
          // Float above the mobile bottom nav (safe-area aware).
          "fixed left-1/2 z-30 -translate-x-1/2",
          "bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] md:bottom-6",
          "inline-flex max-w-[min(20rem,calc(100vw-2rem))] items-center gap-2",
          "rounded-full border bg-background/95 px-3.5 py-2 text-sm font-medium shadow-lg backdrop-blur",
          "transition-colors hover:bg-muted",
        )}
      >
        <List className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">{active.text}</span>
        <ChevronUp className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>On this page</DialogTitle>
          </DialogHeader>
          <ul className="max-h-[60vh] overflow-y-auto border-l">
            {entries.map((entry) => (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "-ml-px block border-l-2 py-1.5 text-sm transition-colors",
                    entry.level === 1 && "pl-3 font-medium",
                    entry.level === 2 && "pl-5",
                    entry.level === 3 && "pl-8 text-[13px]",
                    entry.id === activeId
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {entry.text}
                </a>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
