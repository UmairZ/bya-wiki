"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDays, FolderOpen, Inbox, Menu, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import { COMING_SOON_LABEL, MODULES } from "./nav-items";

const PRIMARY = [
  { href: "/events", label: "Events", Icon: CalendarDays },
  { href: "/resources", label: "Resources", Icon: FolderOpen },
  { href: "/search", label: "Search", Icon: Search },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="flex items-stretch justify-around">
          {PRIMARY.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  prefetch
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary"
                    />
                  )}
                  <Icon
                    className={cn("size-5", active && "stroke-[2.25]")}
                    aria-hidden
                  />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="relative flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
            >
              <Menu className="size-5" aria-hidden />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>More</DialogTitle>
          </DialogHeader>
          <ul className="flex flex-col gap-1">
            <li>
              <Link
                href="/tasks"
                prefetch
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/60"
              >
                <Inbox className="size-4" aria-hidden />
                <span>Tasks</span>
              </Link>
            </li>
            <li className="my-1 border-t" />
            {MODULES.filter((m) => m.comingSoon).map((m) => (
              <li key={m.href}>
                <div
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/70"
                  title="Coming in a future update"
                >
                  <m.Icon className="size-4" aria-hidden />
                  <span className="flex-1">{m.label}</span>
                  <Pill tone="neutral">{COMING_SOON_LABEL}</Pill>
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
