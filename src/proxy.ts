import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed `middleware` → `proxy`. Same mechanism.
//
// Responsibilities (intentionally light, per Next 16 guidance — heavy auth
// logic lives in layouts/pages):
//   1. Refresh the Supabase session cookies on every request.
//   2. Redirect unauthenticated requests to /login (except /login itself).
//
// The forced-password-change redirect and the owner-only /team gate run in
// the corresponding layouts/pages where they have full server context.

const PUBLIC_PATHS = new Set<string>(["/login"]);

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT (per @supabase/ssr docs): do not insert work between
  // createServerClient and supabase.auth.getUser — getUser may refresh the
  // session and rotate cookies via setAll above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !PUBLIC_PATHS.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") {
      url.searchParams.set("next", pathname);
    }
    const redirect = NextResponse.redirect(url);
    // Forward any cookies @supabase/ssr set during the refresh.
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    const redirect = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on every request except: Next internals, static assets, images, our SVG icons.
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|bya-logo-placeholder\\.svg|.*\\.(?:png|jpg|jpeg|gif|webp|svg|css|js|woff|woff2|ttf)$).*)",
  ],
};
