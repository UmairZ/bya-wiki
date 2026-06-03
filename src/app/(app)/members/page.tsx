import { Users } from "lucide-react";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata = { title: "Members" };

export default function MembersPage() {
  return (
    <ComingSoon
      title="Members"
      phase="future phase"
      description="Roster, attendance, parent contacts, and group-level views of who's involved with each event."
      Icon={Users}
    />
  );
}
