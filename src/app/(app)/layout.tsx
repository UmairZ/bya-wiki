import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CommandPalette } from "@/components/app-shell/command-palette";
import {
  DesktopSidebar,
  type SidebarSpace,
} from "@/components/app-shell/desktop-sidebar";
import { MobileBottomNav } from "@/components/app-shell/mobile-bottom-nav";
import { MobileTopBar } from "@/components/app-shell/mobile-top-bar";
import { ServiceWorkerRegistration } from "@/components/app-shell/service-worker-registration";

async function loadSidebarSpaces(): Promise<SidebarSpace[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, icon, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
  }));
}

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

  const spaces = await loadSidebarSpaces();

  return (
    <div className="flex min-h-svh">
      <DesktopSidebar {...profileProps} spaces={spaces} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar {...profileProps} />
        <main className="min-w-0 flex-1 overflow-x-clip pb-[max(env(safe-area-inset-bottom),5rem)] md:pb-0">
          {children}
        </main>
        <MobileBottomNav />
      </div>
      <CommandPalette />
      <ServiceWorkerRegistration />
    </div>
  );
}
