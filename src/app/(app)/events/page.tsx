import { CalendarDays } from "lucide-react";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata = { title: "Events" };

export default function EventsPage() {
  return (
    <ComingSoon
      title="Events"
      phase="Phase 5"
      description="Calendar and agenda views. Create events, pull up what's coming, pin them to home."
      Icon={CalendarDays}
    />
  );
}
