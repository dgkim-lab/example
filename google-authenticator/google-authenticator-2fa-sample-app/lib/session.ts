import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-only-secret-change-me",
);
const COOKIE = "session";

export async function setSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getUserId() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    return (await jwtVerify(token, secret)).payload.userId as string;
  } catch {
    return null;
  }
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
  (await cookies()).delete("twoFactorVerified");
}
