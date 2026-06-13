"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
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
import { createMemberAction } from "../actions";
import { TempPasswordDialog } from "./temp-password-dialog";

export function CreateMemberButton() {
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await createMemberAction(undefined, formData);
      if (result.ok) {
        setReveal(result.data);
        setFormOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Button onClick={() => setFormOpen(true)}>
        <UserPlus className="size-4" aria-hidden />
        Add member
      </Button>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>
              Creates the account and generates a one-time temporary password.
              The member is forced to set their own password on first login.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="m-email">Email</Label>
              <Input
                id="m-email"
                name="email"
                type="email"
                autoComplete="off"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="m-name">Display name</Label>
              <Input
                id="m-name"
                name="display_name"
                type="text"
                autoComplete="off"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="m-role">Role</Label>
              <select
                id="m-role"
                name="role"
                defaultValue="editor"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="editor">Editor</option>
                <option value="owner">Owner</option>
              </select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TempPasswordDialog
        reveal={reveal}
        onClose={() => setReveal(null)}
        title="Account created"
        description="Share this temporary password with the member out-of-band. They'll be forced to choose a new one on first login. You won't see this password again."
      />
    </>
  );
}
