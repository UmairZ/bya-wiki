import Image from "next/image";
import Link from "next/link";
import { APP_NAME, LOGO_ALT, LOGO_SRC } from "@/lib/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/login" className="flex items-center gap-3">
        <Image
          src={LOGO_SRC}
          alt={LOGO_ALT}
          width={48}
          height={48}
          priority
          className="rounded-full"
        />
        <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
      </Link>
      <main className="w-full max-w-sm">{children}</main>
    </div>
  );
}
