"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Inline URL display + copy-to-clipboard button. Replaces the old "Register"
 *  CTA on event detail — staff need to grab the link to share, not click it. */
export function CopyField({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Try selecting + copying manually.");
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/80">
        {value}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy link"}
        className={cn(
          "flex size-7 items-center justify-center rounded-md transition-colors hover:bg-muted",
          copied && "text-primary",
        )}
      >
        {copied ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
      </button>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open link in new tab"
          className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-muted"
        >
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
    </div>
  );
}
