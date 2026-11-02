import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { verifyTotp } from "@/lib/totp";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { code } = await req.json();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.totpSecret || !verifyTotp(user.totpSecret, String(code ?? "")))
    return NextResponse.json({ error: "Invalid authenticator code." }, { status: 400 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("twoFactorVerified", "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 });
  return response;
}
