import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { requireOwner } from "@/lib/auth/current-user";
import {
  GOOGLE_OAUTH_SCOPES,
  getGoogleOAuthClient,
} from "@/lib/calendar/google";

const STATE_COOKIE = "bya_google_oauth_state";

export async function GET(request: NextRequest) {
  // Owner gate.
  await requireOwner();

  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    `${request.nextUrl.origin}/api/auth/google/callback`;

  const oauth2 = getGoogleOAuthClient(redirectUri);
  const state = crypto.randomUUID();

  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a refresh token even if previously granted
    scope: GOOGLE_OAUTH_SCOPES,
    state,
    include_granted_scopes: true,
  });

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 min
  });

  return NextResponse.redirect(authUrl);
}
