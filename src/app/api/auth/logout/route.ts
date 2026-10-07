import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { logoutUser } from "@/services/auth.service";

export async function POST(request: Request) {
  const session = await getSession();
  const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || "Unknown";

  await logoutUser(session?.id, clientIp, userAgent);

  const isHttps = request.url.startsWith("https://");

  const response = NextResponse.json({ success: true, redirectTo: "/login" });
  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
