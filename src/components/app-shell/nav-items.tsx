import {
  CalendarDays,
  FolderOpen,
  Lightbulb,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// All Soon badges across the sidebar + mobile More sheet use this label
// so swapping the wording later is a one-line change.
export const COMING_SOON_LABEL = "Soon";

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
  { href: "/finances", label: "Finances", Icon: Wallet, comingSoon: true },
];
