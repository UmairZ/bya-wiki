import { Search } from "lucide-react";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <ComingSoon
      title="Search"
      phase="Phase 3"
      description="Full-text search across pages, events, and files. ⌘K from anywhere."
      Icon={Search}
    />
  );
}
