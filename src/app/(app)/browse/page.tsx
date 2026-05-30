import { LayoutGrid } from "lucide-react";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata = { title: "Browse" };

export default function BrowsePage() {
  return (
    <ComingSoon
      title="Browse"
      phase="Phase 2"
      description="Categories and pages land here. You'll see every page in a category at a glance — no hunting through a tree."
      Icon={LayoutGrid}
    />
  );
}
