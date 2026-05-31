import { CalendarDays, House, Search, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", Icon: House },
  { href: "/events", label: "Events", Icon: CalendarDays },
  { href: "/search", label: "Search", Icon: Search },
];
