import Image from "next/image";
import Link from "next/link";
import { APP_NAME, LOGO_ALT, LOGO_SRC } from "@/lib/brand";
import { ProfileMenu, type ProfileMenuProps } from "./profile-menu";

export function MobileTopBar(props: ProfileMenuProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-background/90 px-4 py-2.5 backdrop-blur pt-[max(env(safe-area-inset-top),0.625rem)] md:hidden">
      <Link href="/events" className="flex items-center gap-2 min-w-0">
        <Image
          src={LOGO_SRC}
          alt={LOGO_ALT}
          width={28}
          height={28}
          priority
          className="rounded-full shrink-0"
        />
        <span className="truncate text-sm font-semibold tracking-tight">
          {APP_NAME}
        </span>
      </Link>
      <ProfileMenu {...props} variant="compact" align="end" />
    </header>
  );
}
