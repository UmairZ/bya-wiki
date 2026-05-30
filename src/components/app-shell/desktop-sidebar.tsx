"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME, LOGO_ALT, LOGO_SRC } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { ProfileMenu, type ProfileMenuProps } from "./profile-menu";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function DesktopSidebar(props: ProfileMenuProps) {
  const pathname = usePathname();
  return (
    <aside
      aria-label="Primary"
      className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex"
    >
      <div className="flex items-center gap-2.5 px-4 py-4">
        <Image
          src={LOGO_SRC}
          alt={LOGO_ALT}
          width={32}
          height={32}
          priority
          className="rounded-full"
        />
        <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2 py-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <ProfileMenu {...props} side="top" align="start" />
      </div>
    </aside>
  );
}
