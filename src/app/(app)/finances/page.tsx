import { Wallet } from "lucide-react";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata = { title: "Finances" };

export default function FinancesPage() {
  return (
    <ComingSoon
      title="Finances"
      phase="future phase"
      description="Budget tracking, donations, vendor payments, and per-event spend reconciliation."
      Icon={Wallet}
    />
  );
}
