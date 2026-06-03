import { Lightbulb } from "lucide-react";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata = { title: "Bike Rack" };

export default function BikeRackPage() {
  return (
    <ComingSoon
      title="Bike Rack"
      phase="future phase"
      description="Parking lot for event ideas that aren't on the calendar yet. Promote an idea to a real event when the date and scope firm up."
      Icon={Lightbulb}
    />
  );
}
