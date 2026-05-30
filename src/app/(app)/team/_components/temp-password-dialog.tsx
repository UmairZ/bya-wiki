"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TempPasswordDialog({
  reveal,
  onClose,
  title,
  description,
}: {
  reveal: { email: string; tempPassword: string } | null;
  onClose: () => void;
  title: string;
  description: string;
}) {
  const [copied, setCopied] = useState(false);
  const open = reveal !== null;

  async function copy() {
    if (!reveal) return;
    try {
      await navigator.clipboard.writeText(reveal.tempPassword);
      setCopied(true);
      toast.success("Password copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the password and copy manually.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setCopied(false);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {reveal && (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Email
              </p>
              <p className="mt-1 break-all text-sm font-medium">
                {reveal.email}
              </p>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Temporary password
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-background px-2 py-1.5 font-mono text-sm">
                  {reveal.tempPassword}
                </code>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={copy}
                  aria-label="Copy password"
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
