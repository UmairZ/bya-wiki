import {
  CalendarDays,
  FolderClosed,
  House,
  LayoutGrid,
  Search,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", Icon: House },
  { href: "/browse", label: "Browse", Icon: LayoutGrid },
  { href: "/events", label: "Events", Icon: CalendarDays },
  { href: "/files", label: "Files", Icon: FolderClosed },
  { href: "/search", label: "Search", Icon: Search },
];
