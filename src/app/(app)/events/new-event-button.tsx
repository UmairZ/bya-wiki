"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventDialog } from "./event-dialog";

export function NewEventButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CalendarPlus className="size-4" aria-hidden />
        New event
      </Button>
      <EventDialog open={open} onOpenChange={setOpen} event={null} />
    </>
  );
}
