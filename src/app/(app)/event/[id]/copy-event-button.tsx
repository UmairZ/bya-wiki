"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatFullDateString, formatTime } from "@/lib/date-time";
import type { AudienceTag, GenderTag } from "@/lib/supabase/types";

export type EventForCopy = {
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  audience: AudienceTag | null;
  gender: GenderTag | null;
  free_tags: string[];
  registration_url: string | null;
  description: string | null;
};

/** WhatsApp-friendly plaintext block. Title uses *bold*, lines use emoji
 *  prefixes that render natively on every platform. Skips empty fields. */
export function buildEventCopyText(e: EventForCopy): string {
  const lines: string[] = [];
  lines.push(`*${e.title}*`);

  if (e.starts_at) {
    const dateStr = formatFullDateString(e.starts_at);
    let timeStr = "";
    if (e.all_day) {
      timeStr = "All day";
    } else if (e.ends_at) {
      timeStr = `${formatTime(e.starts_at)} – ${formatTime(e.ends_at)}`;
    } else {
      timeStr = formatTime(e.starts_at);
    }
    lines.push(`🗓 ${dateStr} · ${timeStr}`);
  }

  if (e.location) lines.push(`📍 ${e.location}`);

  // "Both" is the default — omit so the line reads cleaner. Girls/Boys is
  // the meaningful signal worth surfacing in a share blurb.
  const genderToShow = e.gender && e.gender !== "Both" ? e.gender : null;
  const ag = [e.audience, genderToShow].filter(Boolean);
  if (ag.length > 0) lines.push(`👥 ${ag.join(" · ")}`);

  // Always link to the canonical bit.ly that lands on /r/events — the
  // page lists every active flyer and is easier to remember/share than
  // any one event's registration URL.
  if (e.registration_url) lines.push(`🔗 bit.ly/bya-events`);

  if (e.free_tags.length > 0) {
    lines.push(`🏷 ${e.free_tags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" ")}`);
  }

  const desc = e.description?.trim();
  if (desc) {
    lines.push("");
    lines.push(desc);
  }

  return lines.join("\n");
}

export function CopyEventButton({
  event,
  className,
}: {
  event: EventForCopy;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = buildEventCopyText(event);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Event details copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      title="Copy event details (WhatsApp-ready)"
      aria-label="Copy event details"
      className={cn("bg-card text-muted-foreground shadow-sm hover:text-foreground", className)}
    >
      {copied ? (
        <Check className="text-emerald-600 dark:text-emerald-400" aria-hidden />
      ) : (
        <Copy aria-hidden />
      )}
      <span>{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}
