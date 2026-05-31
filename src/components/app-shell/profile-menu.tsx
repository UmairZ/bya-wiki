"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { FolderTree, KeyRound, LogOut, Trash2, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangePasswordDialog } from "./change-password-dialog";

export type ProfileMenuProps = {
  displayName: string;
  email: string;
  role: "owner" | "editor";
  side?: "top" | "bottom";
  align?: "start" | "end";
  variant?: "compact" | "expanded";
};

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ProfileMenu({
  displayName,
  email,
  role,
  side = "bottom",
  align = "end",
  variant = "expanded",
}: ProfileMenuProps) {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const isOwner = role === "owner";

  function handleSignOut() {
    startSignOut(async () => {
      try {
        await fetch("/sign-out", { method: "POST" });
      } finally {
        window.location.href = "/login";
      }
    });
  }

  const initials = initialsOf(displayName) || "?";

  const trigger =
    variant === "compact" ? (
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            className="flex size-9 items-center justify-center rounded-full transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        }
      />
    ) : (
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium text-sidebar-foreground">
                {displayName}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {email}
              </span>
            </span>
          </button>
        }
      />
    );

  return (
    <>
      <DropdownMenu>
        {trigger}
        <DropdownMenuContent
          side={side}
          align={align}
          className="w-64"
          sideOffset={6}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col gap-1 pb-2">
              <span className="font-medium">{displayName}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {email}
              </span>
              <Badge variant="secondary" className="mt-1 w-fit capitalize">
                {role}
              </Badge>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {isOwner && (
            <>
              <DropdownMenuItem render={<Link href="/team" />}>
                <Users className="size-4" aria-hidden />
                Team
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/admin/categories" />}>
                <FolderTree className="size-4" aria-hidden />
                Categories
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/admin/trash" />}>
                <Trash2 className="size-4" aria-hidden />
                Trash
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
            <KeyRound className="size-4" aria-hidden />
            Change password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut className="size-4" aria-hidden />
            {signingOut ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </>
  );
}
