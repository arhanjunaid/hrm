import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { User } from "@/db/schema";

const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || "super-secret-key-recruitment-portal-2026-auth-jwt"
);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "VENDOR";
  vendorId: string | null;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    vendorId: user.vendorId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as "ADMIN" | "VENDOR",
      vendorId: (payload.vendorId as string) || null,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

export function shouldUseSecureCookies(request?: Request): boolean {
  // A `Secure` cookie is rejected by browsers over plain HTTP, which silently
  // breaks login on HTTP deployments. Derive it from the actual request scheme.
  if (request) {
    const forwardedProto = request.headers.get("x-forwarded-proto");
    if (forwardedProto) return forwardedProto.split(",")[0].trim() === "https";
    try {
      return new URL(request.url).protocol === "https:";
    } catch {
      // fall through to env default
    }
  }
  return process.env.NODE_ENV === "production";
}

export async function setSessionCookie(token: string, secure?: boolean) {
  const cookieStore = await cookies();
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: secure ?? process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function clearSessionCookie(secure?: boolean) {
  const cookieStore = await cookies();
  cookieStore.set("auth_token", "", {
    httpOnly: true,
    secure: secure ?? process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireAuth();
  if (session.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function requireVendor(): Promise<SessionUser> {
  const session = await requireAuth();
  if (session.role !== "VENDOR" || !session.vendorId) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
