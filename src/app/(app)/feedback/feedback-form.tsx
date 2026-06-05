"use client";

import { useRef, useState, useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedbackAction } from "./actions";

export function FeedbackForm() {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const taRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const r = await submitFeedbackAction(trimmed);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setBody("");
      toast.success("Thanks — idea submitted.");
      taRef.current?.focus();
    });
  }

  return (
    <form
      className="flex flex-col gap-2 rounded-lg border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Textarea
        ref={taRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What would make this app better? Bug, idea, anything…"
        rows={3}
        disabled={pending}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        className="resize-none"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Tip: ⌘/Ctrl + Enter to send
        </span>
        <Button size="sm" type="submit" disabled={pending || !body.trim()}>
          <Send className="size-3.5" aria-hidden />
          {pending ? "Sending…" : "Send"}
        </Button>
      </div>
    </form>
  );
}
