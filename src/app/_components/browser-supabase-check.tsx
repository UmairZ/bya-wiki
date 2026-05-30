"use client";

import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function BrowserSupabaseCheck() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["supabase-browser-health"],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getUser();
      if (error && error.name !== "AuthSessionMissingError") throw error;
      return { signedIn: Boolean(data?.user) };
    },
  });

  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden
        className={`inline-block size-2.5 rounded-full ${
          isLoading
            ? "bg-muted-foreground/40"
            : isError
              ? "bg-destructive"
              : "bg-primary"
        }`}
      />
      <span>
        Supabase reachable from browser:{" "}
        {isLoading ? (
          <span className="text-muted-foreground">checking…</span>
        ) : isError ? (
          <span className="text-destructive">
            {error instanceof Error ? error.message : "failed"}
          </span>
        ) : (
          <span className="text-muted-foreground">
            ok ({data?.signedIn ? "session present" : "no session"})
          </span>
        )}
      </span>
    </li>
  );
}
