import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { requireOwner } from "@/lib/auth/current-user";
import {
  getGoogleOAuthClient,
  saveConnection,
} from "@/lib/calendar/google";

const STATE_COOKIE = "bya_google_oauth_state";

function redirectWithStatus(
  origin: string,
  status: "ok" | "error",
  message?: string,
) {
  const url = new URL("/admin/integrations", origin);
  url.searchParams.set("google", status);
  if (message) url.searchParams.set("google_msg", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const current = await requireOwner();
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const errorParam = request.nextUrl.searchParams.get("error");

  if (errorParam) {
    return redirectWithStatus(origin, "error", errorParam);
  }
  if (!code || !state) {
    return redirectWithStatus(origin, "error", "missing_params");
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  if (!expectedState || expectedState !== state) {
    return redirectWithStatus(origin, "error", "state_mismatch");
  }

  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    `${origin}/api/auth/google/callback`;
  const oauth2 = getGoogleOAuthClient(redirectUri);

  let refreshToken: string | undefined;
  let accessToken: string | undefined;
  let expiresAtIso: string | undefined;
  let email: string | null = null;

  try {
    const { tokens } = await oauth2.getToken(code);
    refreshToken = tokens.refresh_token ?? undefined;
    accessToken = tokens.access_token ?? undefined;
    if (tokens.expiry_date) {
      expiresAtIso = new Date(tokens.expiry_date).toISOString();
    } else {
      expiresAtIso = new Date(Date.now() + 55 * 60 * 1000).toISOString();
    }

    // Fetch the connected user's email.
    if (accessToken) {
      const resp = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (resp.ok) {
        const info = (await resp.json()) as { email?: string };
        email = info.email ?? null;
      }
    }
  } catch (err) {
    return redirectWithStatus(
      origin,
      "error",
      err instanceof Error ? err.message : "token_exchange_failed",
    );
  }

  if (!refreshToken) {
    return redirectWithStatus(
      origin,
      "error",
      "no_refresh_token_returned__revoke_in_google_account_settings_and_retry",
    );
  }
  if (!accessToken || !expiresAtIso) {
    return redirectWithStatus(origin, "error", "missing_access_token");
  }

  try {
    await saveConnection({
      refreshToken,
      accessToken,
      accessTokenExpiresAt: expiresAtIso,
      connectedEmail: email,
      connectedBy: current.userId,
    });
  } catch (err) {
    return redirectWithStatus(
      origin,
      "error",
      err instanceof Error ? err.message : "save_failed",
    );
  }

  return redirectWithStatus(origin, "ok");
}
