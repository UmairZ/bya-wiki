import {
  CalendarDays,
  FolderOpen,
  Lightbulb,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type Module = {
  href: string;
  label: string;
  Icon: LucideIcon;
  comingSoon?: boolean;
  /** When true, the sidebar lists this module's sub-items inline. */
  expandable?: boolean;
};

/** Top-level modules in the sidebar. Order matters — first entry is the
 *  default landing for `/`. */
export const MODULES: Module[] = [
  { href: "/events", label: "Events", Icon: CalendarDays },
  { href: "/resources", label: "Resources", Icon: FolderOpen, expandable: true },
  { href: "/bike-rack", label: "Bike Rack", Icon: Lightbulb, comingSoon: true },
  { href: "/members", label: "Members", Icon: Users, comingSoon: true },
  { href: "/finances", label: "Finances", Icon: Wallet, comingSoon: true },
];
