"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
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

  const ag = [e.audience, e.gender].filter(Boolean);
  if (ag.length > 0) lines.push(`👥 ${ag.join(" · ")}`);

  if (e.registration_url) lines.push(`🔗 ${e.registration_url}`);

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
    <button
      type="button"
      onClick={handleCopy}
      title="Copy event details (WhatsApp-ready)"
      aria-label="Copy event details"
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border bg-card px-2 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
