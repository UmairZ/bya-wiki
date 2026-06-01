import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { CommandPalette } from "@/components/app-shell/command-palette";
import { DesktopSidebar } from "@/components/app-shell/desktop-sidebar";
import { MobileBottomNav } from "@/components/app-shell/mobile-bottom-nav";
import { MobileTopBar } from "@/components/app-shell/mobile-top-bar";
import { ServiceWorkerRegistration } from "@/components/app-shell/service-worker-registration";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { email, profile } = await requireCurrentUser();

  if (profile.must_change_password) {
    redirect("/set-password");
  }

  const profileProps = {
    displayName: profile.display_name,
    email,
    role: profile.role,
  };

  return (
    <div className="flex min-h-svh">
      <DesktopSidebar {...profileProps} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar {...profileProps} />
        {/* Desktop breadcrumb bar — empty placeholder for now (Phase 2 fills it). */}
        <div className="hidden h-12 items-center border-b px-6 text-sm text-muted-foreground md:flex" />
        <main className="flex-1 pb-[max(env(safe-area-inset-bottom),5rem)] md:pb-0">
          {children}
        </main>
        <MobileBottomNav />
      </div>
      <CommandPalette />
      <ServiceWorkerRegistration />
    </div>
  );
}
