"use client";

import { useActionState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  changePasswordAction,
  type ChangePasswordState,
} from "@/app/(app)/_actions/change-password";

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState<
    ChangePasswordState,
    FormData
  >(changePasswordAction, undefined);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      toast.success("Password updated.");
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Pick a new password. You&apos;ll stay signed in.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          {state && "error" in state && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="cp-password">New password</Label>
            <Input
              id="cp-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
            />
            <p className="text-xs text-muted-foreground">
              At least 10 characters.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cp-confirm">Confirm new password</Label>
            <Input
              id="cp-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Update password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
