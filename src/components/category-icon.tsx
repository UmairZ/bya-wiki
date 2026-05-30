import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Compass,
  FileText,
  Folder,
  Heart,
  Image as ImageIcon,
  Lightbulb,
  Link as LinkIcon,
  ListChecks,
  Mail,
  MessageSquare,
  Notebook,
  Package,
  PenLine,
  Phone,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Curated icon registry. Add more lucide icons here as owners pick them.
// Keys are kebab-case to match lucide's canonical name conventions.
const ICONS: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  "calendar-days": CalendarDays,
  "clipboard-list": ClipboardList,
  compass: Compass,
  "file-text": FileText,
  folder: Folder,
  heart: Heart,
  image: ImageIcon,
  lightbulb: Lightbulb,
  link: LinkIcon,
  "list-checks": ListChecks,
  mail: Mail,
  "message-square": MessageSquare,
  notebook: Notebook,
  package: Package,
  "pen-line": PenLine,
  phone: Phone,
  "scroll-text": ScrollText,
  settings: Settings,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  sprout: Sprout,
  star: Star,
  users: Users,
  wrench: Wrench,
};

export const CATEGORY_ICON_NAMES = Object.keys(ICONS).sort();

export function CategoryIcon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = (name && ICONS[name]) || Folder;
  return <Icon className={cn("size-5", className)} aria-hidden />;
}
