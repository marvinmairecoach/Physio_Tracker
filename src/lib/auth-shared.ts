import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export function getJwtSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "fallback-dev-secret-change-in-production"
  );
}

export interface AuthSession {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export async function createToken(
  payload: AuthSession,
  cookieName: string
): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getJwtSecret());

  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return token;
}

export async function getAuthSession(
  cookieName: string
): Promise<AuthSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (!token) throw new Error("Unauthorized");

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as AuthSession;
  } catch {
    throw new Error("Unauthorized");
  }
}

export async function removeAuthCookie(cookieName: string) {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}