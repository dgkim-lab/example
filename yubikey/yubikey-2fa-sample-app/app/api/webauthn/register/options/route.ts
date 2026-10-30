import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { db } from "@/lib/db";
import { registrationOptions } from "@/lib/webauthn";
export async function GET() {
  const id = await getUserId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await db.user.findUnique({ where: { id } });
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const options = await registrationOptions(id, user.email);
  const response = NextResponse.json(options);
  response.cookies.set("webauthnChallenge", options.challenge, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  });
  return response;
}
