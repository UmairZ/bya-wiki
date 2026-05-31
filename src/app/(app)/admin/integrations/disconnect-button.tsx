"use client";

import { useTransition } from "react";
import { Unplug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { disconnectGoogleAction } from "./actions";

export function DisconnectButton() {
  const [pending, startTransition] = useTransition();

  function handleDisconnect() {
    if (
      !window.confirm(
        "Disconnect Google Calendar? Members will no longer be able to create/edit events from the wiki until you reconnect.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await disconnectGoogleAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Disconnected.");
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDisconnect}
      disabled={pending}
    >
      <Unplug className="size-4" aria-hidden />
      Disconnect
    </Button>
  );
}
