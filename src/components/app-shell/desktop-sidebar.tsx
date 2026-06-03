"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, Inbox, Search } from "lucide-react";
import { APP_NAME, LOGO_ALT, LOGO_SRC } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { MODULES, type Module } from "./nav-items";
import { ProfileMenu, type ProfileMenuProps } from "./profile-menu";
import { CategoryIcon } from "@/components/category-icon";

export type SidebarSpace = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

export type DesktopSidebarProps = ProfileMenuProps & {
  spaces: SidebarSpace[];
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function openCommandPalette() {
  window.dispatchEvent(new Event("bya:open-command-palette"));
}

function ModuleRow({
  module,
  pathname,
  expandable,
  expanded,
  onToggleExpand,
}: {
  module: Module;
  pathname: string;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const active = isActive(pathname, module.href);
  const { Icon } = module;

  if (module.comingSoon) {
    return (
      <div
        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/40"
        title="Coming in a future update"
      >
        <Icon className="size-4" aria-hidden />
        <span className="flex-1">{module.label}</span>
        <span className="rounded-full bg-sidebar-accent/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Soon
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      <Link
        href={module.href}
        prefetch
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-1 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden />
        <span>{module.label}</span>
      </Link>
      {expandable && (
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={expanded ? `Collapse ${module.label}` : `Expand ${module.label}`}
          aria-expanded={expanded}
          className="flex size-7 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight
            className={cn(
              "size-3.5 transition-transform",
              expanded && "rotate-90",
            )}
            aria-hidden
          />
        </button>
      )}
    </div>
  );
}

export function DesktopSidebar({ spaces, ...profile }: DesktopSidebarProps) {
  const pathname = usePathname();
  // Auto-expand Resources when the user is anywhere inside it.
  const insideResources =
    pathname.startsWith("/resources") || pathname.startsWith("/c/");
  const [resourcesOpen, setResourcesOpen] = useState(insideResources);

  useEffect(() => {
    if (insideResources) setResourcesOpen(true);
  }, [insideResources]);

  return (
    <aside
      aria-label="Primary"
      className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex"
    >
      <Link
        href="/events"
        prefetch
        className="flex items-center gap-2.5 px-4 py-4 transition-opacity hover:opacity-80"
      >
        <Image
          src={LOGO_SRC}
          alt={LOGO_ALT}
          width={32}
          height={32}
          priority
          className="rounded-full"
        />
        <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
      </Link>

      <div className="px-2 pb-2">
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex w-full items-center gap-2.5 rounded-md border bg-background/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1 text-left">Search</span>
          <kbd className="hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline-flex">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2 py-1">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Modules
        </p>
        {MODULES.map((m) => (
          <div key={m.href} className="flex flex-col gap-0.5">
            <ModuleRow
              module={m}
              pathname={pathname}
              expandable={m.expandable}
              expanded={m.expandable ? resourcesOpen : undefined}
              onToggleExpand={
                m.expandable ? () => setResourcesOpen((v) => !v) : undefined
              }
            />
            {m.expandable && resourcesOpen && (
              <ul className="ml-6 flex flex-col gap-0.5 border-l pl-2 pt-0.5">
                {spaces.length === 0 && (
                  <li className="px-2 py-1 text-xs text-muted-foreground">
                    No spaces yet.
                  </li>
                )}
                {spaces.map((space) => {
                  const href = `/c/${space.slug}`;
                  const active = pathname === href;
                  return (
                    <li key={space.id}>
                      <Link
                        href={href}
                        prefetch
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                        )}
                      >
                        <span className="flex size-5 items-center justify-center text-sidebar-foreground/60">
                          <CategoryIcon name={space.icon} className="size-3.5" />
                        </span>
                        <span className="truncate">{space.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}

        <div className="my-2 border-t" />

        <Link
          href="/tasks"
          prefetch
          aria-current={isActive(pathname, "/tasks") ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive(pathname, "/tasks")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
          )}
        >
          <Inbox className="size-4" aria-hidden />
          <span>Tasks</span>
        </Link>
      </nav>

      <div className="border-t p-2">
        <ProfileMenu {...profile} side="top" align="start" />
      </div>
    </aside>
  );
}
