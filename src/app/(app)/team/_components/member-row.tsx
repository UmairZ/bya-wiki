"use client";

import { useState, useTransition } from "react";
import {
  KeyRound,
  MoreHorizontal,
  ShieldCheck,
  UserCheck,
  UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  resetMemberPasswordAction,
  setMemberActiveAction,
  setMemberRoleAction,
} from "../actions";
import { TempPasswordDialog } from "./temp-password-dialog";
import type { Member } from "../page";

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function MemberRow({
  member,
  isSelf,
}: {
  member: Member;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [reveal, setReveal] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);

  function handleResetPassword() {
    startTransition(async () => {
      const result = await resetMemberPasswordAction(member.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setReveal(result.data);
    });
  }

  function handleSetRole(role: "owner" | "editor") {
    startTransition(async () => {
      const result = await setMemberRoleAction(member.id, role);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Role updated to ${role}.`);
    });
  }

  function handleSetActive(active: boolean) {
    startTransition(async () => {
      const result = await setMemberActiveAction(member.id, active);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(active ? "Member reactivated." : "Member deactivated.");
    });
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar className="size-9 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            {initialsOf(member.display_name) || "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">
              {member.display_name}
            </span>
            {isSelf && (
              <span className="text-xs text-muted-foreground">(you)</span>
            )}
            <Badge variant="secondary" className="capitalize">
              {member.role}
            </Badge>
            {!member.active && (
              <Badge variant="destructive">Deactivated</Badge>
            )}
            {member.must_change_password && (
              <Badge variant="outline">Must change password</Badge>
            )}
          </div>
          <span className="truncate text-xs text-muted-foreground">
            {member.email}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Member actions"
                disabled={pending}
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleResetPassword}>
              <KeyRound className="size-4" aria-hidden />
              Reset password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {member.role === "editor" ? (
              <DropdownMenuItem onClick={() => handleSetRole("owner")}>
                <ShieldCheck className="size-4" aria-hidden />
                Make owner
              </DropdownMenuItem>
            ) : (
              !isSelf && (
                <DropdownMenuItem onClick={() => handleSetRole("editor")}>
                  <UserCheck className="size-4" aria-hidden />
                  Make editor
                </DropdownMenuItem>
              )
            )}
            {!isSelf &&
              (member.active ? (
                <DropdownMenuItem
                  onClick={() => handleSetActive(false)}
                  variant="destructive"
                >
                  <UserMinus className="size-4" aria-hidden />
                  Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleSetActive(true)}>
                  <UserCheck className="size-4" aria-hidden />
                  Reactivate
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TempPasswordDialog
        reveal={reveal}
        onClose={() => setReveal(null)}
        title="Password reset"
        description="Share this temporary password with the member out-of-band. They'll be forced to choose a new one on next login. You won't see this password again."
      />
    </>
  );
}
