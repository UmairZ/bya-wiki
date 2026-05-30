import Image from "next/image";
import { APP_DESCRIPTION, APP_NAME, LOGO_ALT, LOGO_SRC } from "@/lib/brand";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BrowserSupabaseCheck } from "./_components/browser-supabase-check";

type ServerCheck =
  | { ok: true; signedIn: boolean }
  | { ok: false; reason: string };

async function checkSupabaseFromServer(): Promise<ServerCheck> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // AuthSessionMissingError is expected when no user is signed in — that's a successful round-trip.
      if (error.name === "AuthSessionMissingError") {
        return { ok: true, signedIn: false };
      }
      return { ok: false, reason: error.message };
    }
    return { ok: true, signedIn: Boolean(data.user) };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export default async function HealthPage() {
  const server = await checkSupabaseFromServer();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16 sm:py-24">
      <header className="flex items-center gap-4">
        <Image
          src={LOGO_SRC}
          alt={LOGO_ALT}
          width={56}
          height={56}
          priority
          className="rounded-full"
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{APP_NAME}</h1>
          <p className="text-sm text-muted-foreground">{APP_DESCRIPTION}</p>
        </div>
      </header>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-medium text-muted-foreground">
          Phase 0 health check
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-center gap-3">
            <StatusDot ok />
            <span>Next.js app rendered</span>
          </li>
          <li className="flex items-center gap-3">
            <StatusDot ok={server.ok} />
            <span>
              Supabase reachable from server:{" "}
              {server.ok ? (
                <span className="text-muted-foreground">
                  ok ({server.signedIn ? "session present" : "no session"})
                </span>
              ) : (
                <span className="text-destructive">{server.reason}</span>
              )}
            </span>
          </li>
          <BrowserSupabaseCheck />
        </ul>
      </section>

      <section className="rounded-lg border bg-brand-tint p-5 text-brand-tint-foreground">
        <h2 className="text-sm font-semibold">Brand theme</h2>
        <p className="mt-2 text-sm">
          This panel uses the <code>--brand-tint</code> token. The button below
          uses <code>--primary</code> (the brand green, or its dark-mode
          lightened variant).
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-[var(--brand-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Primary button
          </button>
          <a
            href="#"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Brand link
          </a>
        </div>
      </section>

      <footer className="text-xs text-muted-foreground">
        Phase 0 scaffolding. Phase 1 (auth + app shell) is next.
      </footer>
    </main>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2.5 rounded-full ${
        ok ? "bg-primary" : "bg-destructive"
      }`}
    />
  );
}
