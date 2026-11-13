import { NextResponse } from "next/server";
import { getSession, shouldUseSecureCookies } from "@/lib/auth/session";
import { logoutUser } from "@/services/auth.service";

export async function POST(request: Request) {
  const session = await getSession().catch(() => null);
  const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || "Unknown";
  const secure = shouldUseSecureCookies(request);

  // Audit/DB failures must never block logout — the cookie clear below still runs.
  try {
    await logoutUser(session?.id, clientIp, userAgent, secure);
  } catch {
    // ignore — still clear the cookie and report success
  }

  const response = NextResponse.json({ success: true, redirectTo: "/login" });
  // Explicitly expire the cookie on the response so the Set-Cookie header is
  // guaranteed even if the `cookies()` store mutation above throws or is lost.
  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
